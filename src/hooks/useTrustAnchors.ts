/**
 * Backward-compatible re-export.
 *
 * The real implementation now lives in `useGatewayTrustAnchors`.  Existing
 * consumers that import from this file (`BackendSwitcher`, `ContextSwitcher`,
 * `EntityRegisterPage`, `TrustAnchorContext`) keep working without changes.
 */
export {
  useGatewayTrustAnchors as useTrustAnchors,
  type TrustAnchorDisplay,
  type TrustAnchorCreate,
} from '@/hooks/useGatewayTrustAnchors';
