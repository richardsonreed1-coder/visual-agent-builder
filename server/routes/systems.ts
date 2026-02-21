// =============================================================================
// Systems API Routes
// =============================================================================

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody } from '../src/middleware/validation';
import { AppError } from '../src/middleware/error-handler';
import {
  registerSystem,
  getSystem,
  listSystems,
  updateSystemStatus,
  archiveSystem,
  SystemNotFoundError,
} from '../services/registry';

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

const systemManifestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  description: z.string(),
  version: z.string(),
  category: z.enum(['web-development', 'content-production', 'research', 'data-analysis', 'monitoring']),
  requiredInputs: z.array(z.object({
    name: z.string(),
    type: z.string(),
    description: z.string(),
    required: z.boolean(),
  })),
  outputType: z.enum(['web_artifact', 'document', 'data', 'notification']),
  estimatedCostUsd: z.number().min(0),
  triggerPattern: z.enum(['cron', 'webhook', 'messaging', 'always-on']),
  nodeCount: z.number().int().min(0),
  edgeCount: z.number().int().min(0),
});

const registerSystemBodySchema = z.object({
  manifest: systemManifestSchema,
  canvasJson: z.unknown(),
  agentConfigs: z.record(z.string(), z.unknown()),
  mcpConfigs: z.array(z.unknown()),
  pm2Ecosystem: z.unknown(),
  envExample: z.record(z.string(), z.string()),
  createdAt: z.string(),
});

const updateSystemBodySchema = z.object({
  status: z.enum(['deployed', 'stopped', 'errored']),
});

// -----------------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------------

const router = Router();

// GET /api/systems — list all non-archived systems
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const systems = await listSystems();
    res.json({ systems });
  } catch (error) {
    next(error);
  }
});

// POST /api/systems — register a new system from a bundle
router.post(
  '/',
  validateBody(registerSystemBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const record = await registerSystem(req.body);
      res.status(201).json(record);
    } catch (error) {
      // Handle unique slug constraint violation
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23505'
      ) {
        return next(
          new AppError(409, `System with slug "${req.body.manifest.slug}" already exists`, 'DUPLICATE_SLUG')
        );
      }
      next(error);
    }
  }
);

// GET /api/systems/:slug — get a single system
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await getSystem(req.params.slug);
    if (!record) {
      throw new AppError(404, `System "${req.params.slug}" not found`, 'NOT_FOUND');
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// PUT /api/systems/:slug — update system status
router.put(
  '/:slug',
  validateBody(updateSystemBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateSystemStatus(req.params.slug, req.body.status);
      res.json({ success: true });
    } catch (error) {
      // SystemNotFoundError is an AutopilateError with 404 status — pass through
      next(error);
    }
  }
);

// DELETE /api/systems/:slug — archive a system (soft delete)
router.delete('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await archiveSystem(req.params.slug);
    res.status(204).send();
  } catch (error) {
    // SystemNotFoundError is an AutopilateError with 404 status — pass through
    next(error);
  }
});

export { router as systemsRouter };
