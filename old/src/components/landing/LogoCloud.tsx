"use client"

export default function LogoCloud() {
    const logos = [
        { name: "Company 1", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/2560px-Google_2015_logo.svg.png" },
        { name: "Company 2", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Facebook_f_logo_%282019%29.svg/2048px-Facebook_f_logo_%282019%29.svg.png" },
        { name: "Company 3", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Netflix_logo.svg/2560px-Netflix_logo.svg.png" },
        { name: "Company 4", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png" },
        { name: "Company 5", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png" },
    ]

    return (
        <section className="py-12 border-y border-gray-100 bg-white/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-sm font-semibold text-gray-500 mb-8 uppercase tracking-wider">
                    Trusted by innovative teams worldwide
                </p>
                <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    {logos.map((logo, index) => (
                        <div key={index} className="h-8 md:h-10 w-auto flex items-center justify-center transition-all hover:scale-110 hover:opacity-100">
                            <img
                                src={logo.url}
                                alt={logo.name}
                                className="h-full w-auto object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
