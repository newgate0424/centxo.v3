import { unstable_cache } from "next/cache"

export const getCachedData = async <T>(
    key: string[],
    fetchFn: () => Promise<T>,
    revalidate: number = 300 // 5 minutes default
): Promise<T> => {
    const cachedFn = unstable_cache(fetchFn, key, { revalidate })
    return cachedFn()
}
