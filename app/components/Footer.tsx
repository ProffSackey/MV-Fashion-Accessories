export default function Footer() {
  const year = new Date().getFullYear();

  return (
    // Added w-full and cleared any potential parent padding issues
    <footer className="w-full bg-[#1C1C1C] border-t border-[#2A2A2A] text-[#F2F2F2]">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-[#F2F2F2]">MV Fashion Accessories</h3>
            <p className="mt-2 text-sm text-[#D9D9D9]">
              An online market bringing you the best products to your
              doorstep. We offer a secure payment options and efficient delivery services
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#F2F2F2]">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="/" className="text-[#F2F2F2] hover:text-yellow-300">
                  All Products
                </a>
              </li>
              <li>
                <a href="/cart" className="text-[#F2F2F2] hover:text-yellow-300">
                  Cart
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#F2F2F2]">Support</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="/login" className="text-[#F2F2F2] hover:text-yellow-300">
                  Account
                </a>
              </li>
              <li>
                <a href="/terms" className="text-[#F2F2F2] hover:text-yellow-300">
                  Terms &amp; Conditions
                </a>
              </li>
              <li>
                <a href="/shipping-policy" className="text-[#F2F2F2] hover:text-yellow-300">
                  Shipping Policy
                </a>
              </li>
              <li>
                <a href="/refund-policy" className="text-[#F2F2F2] hover:text-yellow-300">
                  Refund Policy
                </a>
              </li>
              <li>
                <a href="/about" className="text-[#F2F2F2] hover:text-yellow-300">
                  About us
                </a>
              </li>
              <li>
                <a href="/contact" className="text-[#F2F2F2] hover:text-yellow-300">
                  Contact us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#F2F2F2]">Subscribe</h4>
            <p className="mt-3 text-sm text-[#D9D9D9]">
              Get the latest deals and updates — subscribe to our newsletter.
            </p>
            <form className="mt-4" aria-label="Subscribe to newsletter">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <div className="max-w-xs flex items-center bg-[#262626] border border-gray-700 rounded-full overflow-hidden shadow-sm">
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="yourmail@example.com"
                  className="flex-1 min-w-0 px-4 py-2 text-[#F2F2F2] placeholder:text-[#A8A8A8] text-sm bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-600/40"
                  aria-label="Email address"
                />
                <button
                  type="submit"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-600/40"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Updated border and text color for better visibility on dark background */}
        <div className="mt-8 border-t border-[#2A2A2A] pt-6 text-center text-sm text-[#A8A8A8]">
          © {year} MV Fashion Accessories — All rights reserved.
        </div>
      </div>
    </footer>
  );
}