export type BundleType = "ctr" | "cafe" | "hac";
export type BundleExtension = "3dsx" | "wuhb" | "nro";

const extMap: Record<BundleType, BundleExtension> = {
    "ctr": "3dsx",
    "cafe": "wuhb",
    "hac": "nro"
}
export const getExtension = (type: BundleType): BundleExtension => extMap[type];

export type BundleIcons = {
    [key in BundleType]?: Blob;
}

export type BundleCache = {
    [key in BundleType]?: Blob;
} & { timestamp: number }

export type BundleBinaries = {
    [key in BundleType]?: Blob;
}

export type BundleAssets = {
    [key in BundleType]?: Blob;
}
