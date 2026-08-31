import Image from "next/image";

export function HydrillaMark({ size = 56 }: { size?: number }) {
  return (
    <Image
      src="/hyd01.png"
      alt="Hydrilla"
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      priority
    />
  );
}
