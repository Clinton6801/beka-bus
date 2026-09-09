import FareCalculator from "@/components/FareCalculator";
import Navigation from "@/components/Navigation";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative w-full py-8 sm:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background image - full coverage */}
        <Image
          src="/hero-bg.jpg"
          alt="School Bus"
          fill
          className="absolute inset-0 object-cover -z-20 w-full h-full"
          priority
          quality={75}
        />

        {/* Content wrapper - NO dark background, just text */}
        <div className="max-w-4xl mx-auto text-center relative z-10 py-8 sm:py-12 px-4 sm:px-6">
          
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight drop-shadow-lg" style={{textShadow: '2px 2px 8px rgba(0,0,0,0.7)'}}>
            Student Transit Made{" "}
            <span className="bg-gradient-to-r from-yellow-300 to-yellow-200 bg-clip-text text-transparent" style={{textShadow: 'none'}}>
              Simple & Affordable
            </span>
          </h1>
          
          <p className="text-sm sm:text-base lg:text-lg text-white/95 mb-4 sm:mb-6 leading-relaxed drop-shadow-lg" style={{textShadow: '1px 1px 4px rgba(0,0,0,0.7)'}}>
            BEKA Academy's dedicated bus service for safe, reliable student transportation.
            Calculate your fare and register your children in minutes.
          </p>

          <div className="bg-white/95 rounded-lg shadow-md p-3 sm:p-5 inline-block mb-4 sm:mb-10 mx-auto max-w-sm border border-white/50">
            <div className="flex items-center gap-3 text-sm sm:text-base text-gray-900 justify-center">
              <span className="text-xl sm:text-2xl">✓</span>
              <span className="text-left">
                <strong className="text-gray-900">Multi-child discounts</strong> 
                <br />
                <span className="text-xs sm:text-sm text-gray-700">Save up to 15% for 3+ children</span>
              </span>
            </div>
          </div>

          <div className="mt-6 sm:mt-10">
            <a
              href="/register"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
            >
              Start Registration Today
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 gap-6 sm:gap-8">
          <div className="text-center">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🚌</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
              Easy Registration
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              Register multiple children in minutes. Add route and trip type preferences for each.
            </p>
          </div>

          <div className="text-center">
            <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">💳</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
              Transparent Pricing
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              See exactly what you'll pay before registering. All fees clearly displayed.
            </p>
          </div>
        </div>
      </section>

      {/* Fare Calculator */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
              Calculate Your Fare
            </h2>
            <p className="text-base sm:text-lg text-gray-600 px-2">
              Choose your route, number of children, and trip type to see your total cost.
            </p>
          </div>
          <FareCalculator />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-purple-600 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Ready to Register?</h2>
          <p className="text-base sm:text-lg mb-6 sm:mb-8 opacity-90 px-2">
            Get your children registered for safe and reliable bus service this term.
          </p>
          <a
            href="/register"
            className="inline-block bg-white text-purple-600 font-semibold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg hover:bg-gray-100 transition-colors text-base sm:text-lg"
          >
            Start Registration
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <h3 className="text-white font-bold mb-3 sm:mb-4">About</h3>
              <p className="text-xs sm:text-sm leading-relaxed">
                BEKA Academy's Student Transit System provides safe, affordable transportation
                for all our students.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3 sm:mb-4">Quick Links</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a href="/" className="hover:text-white transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/register" className="hover:text-white transition-colors">
                    Register
                  </a>
                </li>
                <li>
                  <a href="/parent/login" className="hover:text-white transition-colors">
                    Parent Portal
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3 sm:mb-4">Staff Portal</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a href="/accounts/login" className="hover:text-white transition-colors">
                    Accounts Officer
                  </a>
                </li>
                <li>
                  <a href="/accounts/routes" className="hover:text-white transition-colors">
                    Route Manager (Admin)
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3 sm:mb-4">Support</h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a href="mailto:accounts@beka.ng" className="hover:text-white transition-colors">
                    accounts@beka.ng
                  </a>
                </li>
                <li>
                  <a href="tel:+2341234567890" className="hover:text-white transition-colors">
                    +234 123 456 7890
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-xs sm:text-sm">
            <p>&copy; 2026 BEKA Academy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

