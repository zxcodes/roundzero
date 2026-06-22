type MaybeDisposable = { [Symbol.dispose]?: () => void };

export function disposeRpcResource(resource: unknown): void {
  if (!resource || typeof resource !== "object" || !(Symbol.dispose in resource)) {
    return;
  }

  const dispose = (resource as MaybeDisposable)[Symbol.dispose];
  dispose?.call(resource);
}
