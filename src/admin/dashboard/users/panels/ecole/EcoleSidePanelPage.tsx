export function EcoleSidePanelPage({ recordId }: { recordId?: number | string }) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      <div className="font-semibold text-foreground mb-2">École #{recordId ?? "—"}</div>
      <p>Aperçu école désactivé dans cette démo.</p>
    </div>
  );
}

export default EcoleSidePanelPage;
