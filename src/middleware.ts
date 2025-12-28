export { default } from "next-auth/middleware"

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/settings/:path*",
        "/launch/:path*",
        "/launch-new/:path*",
        "/ads-manager/:path*"
    ],
}
