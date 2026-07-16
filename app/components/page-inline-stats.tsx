export function PageInlineStats({ items }: { items: { value: number | string; label: string }[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <span key={item.label}>
          <span className="font-medium tabular-nums text-foreground">{item.value}</span>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}
