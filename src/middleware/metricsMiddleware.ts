import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDurationSeconds } from '../lib/metrics';

/**
 * Middleware de métriques HTTP Prometheus.
 * - Enregistre la durée d'exécution.
 * - Compte le nombre de requêtes par méthode, route normalisée et statut HTTP.
 * - La normalisation de route évite l'explosion de cardinalité (ex: "/api/vehicles/:id" au lieu de "/api/vehicles/123").
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Démarre le chronomètre
  const end = httpRequestDurationSeconds.startTimer();

  // On attend la fin de la requête pour avoir accès à req.route et au statut final
  res.on('finish', () => {
    // req.route.path contient le chemin défini dans le routeur Express (ex: "/:id")
    // req.baseUrl contient le préfixe de montage du routeur (ex: "/api/vehicles")
    // Si la route n'est pas reconnue, on renvoie "unmatched" pour éviter la fuite de données dynamiques
    const route = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : 'unmatched';
    const status = String(res.statusCode);
    const method = req.method;

    httpRequestsTotal.inc({
      method,
      route,
      status
    });

    end({
      method,
      route,
      status
    });
  });

  next();
}
