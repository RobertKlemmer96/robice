import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './server/config.js';
import { attachSessionUser, requireAuth } from './server/middleware/auth.js';
import { findUserById, getTenantById } from './server/services/authStore.js';
import { createAuthRouter } from './server/routes/auth.js';
import { createAdminRouter } from './server/routes/admin.js';
import { createEntityRouter } from './server/routes/entities.js';
import { createKundenObjekteRouter } from './server/routes/kundenObjekte.js';
import { runStartupMigrations } from './server/db/migrate-json.js';
import * as kundenRepo from './server/repositories/kunden.js';
import * as angeboteRepo from './server/repositories/angebote.js';
import * as rechnungenRepo from './server/repositories/rechnungen.js';
import * as katalogPostenRepo from './server/repositories/katalogPosten.js';
import { createRechnungenExportRouter } from './server/routes/rechnungenExport.js';
import { createDocumentsMailRouter } from './server/routes/documentsMail.js';
import { createAngeboteProzessRouter } from './server/routes/angeboteProzess.js';
import {
  getPdfTemplate,
  savePdfTemplate,
} from './server/repositories/pdfTemplate.js';
import { PDF_TEMPLATE_DEFAULT } from './server/defaults/pdfTemplate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_COOKIE = 'angebot.sid';

const app = express();
app.use(express.json({ limit: '12mb' }));

app.set('trust proxy', 1);

app.use(
  session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(attachSessionUser);

app.use('/api/auth', createAuthRouter({ sessionCookieName: SESSION_COOKIE }));
app.use('/api/admin', createAdminRouter());
app.use('/api/documents', createDocumentsMailRouter());

const kundenRouter = express.Router();
kundenRouter.use(createKundenObjekteRouter());
kundenRouter.use(
  createEntityRouter({
    label: 'Kunden',
    list: kundenRepo.listKunden,
    get: kundenRepo.getKunde,
    save: kundenRepo.saveKunde,
    remove: kundenRepo.deleteKunde,
  })
);
app.use('/api/kunden', kundenRouter);

const angeboteRouter = express.Router();
angeboteRouter.use(createAngeboteProzessRouter());
angeboteRouter.use(
  createEntityRouter({
    label: 'Angebote',
    list: angeboteRepo.listAngebote,
    get: angeboteRepo.getAngebot,
    save: angeboteRepo.saveAngebot,
    remove: angeboteRepo.deleteAngebot,
  })
);
app.use('/api/angebote', angeboteRouter);

app.use(
  '/api/rechnungen',
  createRechnungenExportRouter()
);

app.use(
  '/api/rechnungen',
  createEntityRouter({
    label: 'Rechnungen',
    list: rechnungenRepo.listRechnungen,
    get: rechnungenRepo.getRechnung,
    save: rechnungenRepo.saveRechnung,
    remove: rechnungenRepo.deleteRechnung,
  })
);

app.use(
  '/api/katalog-posten',
  createEntityRouter({
    label: 'Katalog-Posten',
    list: katalogPostenRepo.listKatalogPosten,
    get: katalogPostenRepo.getKatalogPosten,
    save: katalogPostenRepo.saveKatalogPosten,
    remove: katalogPostenRepo.deleteKatalogPosten,
  })
);

app.get('/api/pdf-template', requireAuth, async (req, res) => {
  try {
    const tpl = await getPdfTemplate(req.tenantId, PDF_TEMPLATE_DEFAULT);
    res.json(tpl);
  } catch (err) {
    console.error('pdf-template get:', err);
    res.status(500).json({ error: 'PDF-Vorlage konnte nicht geladen werden.' });
  }
});

app.put('/api/pdf-template', requireAuth, async (req, res) => {
  try {
    let body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Ungültige PDF-Vorlage.' });
      return;
    }

    const user = findUserById(req.userId);
    const tenant = getTenantById(req.tenantId);
    const existing = await getPdfTemplate(req.tenantId, PDF_TEMPLATE_DEFAULT);
    const schemasLocked =
      tenant?.onboarding_completed && user?.role !== 'admin';

    if (schemasLocked) {
      body = {
        ...body,
        angebot: {
          ...(body.angebot || {}),
          nummerSchema: existing.angebot?.nummerSchema,
        },
        rechnung: {
          ...(body.rechnung || {}),
          nummerSchema: existing.rechnung?.nummerSchema,
        },
      };
    }

    const saved = await savePdfTemplate(req.tenantId, body);
    res.json(saved);
  } catch (err) {
    console.error('pdf-template put:', err);
    res.status(500).json({ error: 'PDF-Vorlage konnte nicht gespeichert werden.' });
  }
});

app.use((err, _req, res, next) => {
  if (err?.type === 'entity.too.large') {
    res.status(413).json({
      error: 'Die Vorlage ist zu groß. Bitte kleinere Bilder verwenden (Logo max. 2 MB).',
    });
    return;
  }
  next(err);
});

if (config.isProd) {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

await runStartupMigrations(PDF_TEMPLATE_DEFAULT);

app.listen(config.port, () => {
  console.log(`API läuft auf http://localhost:${config.port}`);
  console.log(`Datenbank: ${config.databasePath}`);
  if (config.isProd) console.log('Produktionsmodus: statische Dateien aus dist/');
});
