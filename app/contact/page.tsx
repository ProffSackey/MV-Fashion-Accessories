import { EnvelopeIcon, MapPinIcon, PhoneIcon } from "@heroicons/react/24/outline";

export const metadata = {
  title: "Contact Us | MV Fashion Accessories",
  description: "Get in touch with MV Fashion Accessories in Accra, Ghana.",
};

const contactItems = [
  {
    label: "0249297046",
    href: "tel:+233249297046",
    icon: PhoneIcon,
  },
  {
    label: "info@mv.com.gh",
    href: "mailto:info@mv.com.gh",
    icon: EnvelopeIcon,
  },
  {
    label: "Accra, Ghana",
    href: "https://maps.google.com/?q=Accra%2C%20Ghana",
    icon: MapPinIcon,
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f5f0e8] text-gray-900">
      <section className="mx-auto flex min-h-[78vh] max-w-4xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.45em] text-gray-500">Get In Touch</p>
        <h1 className="mt-8 font-serif text-5xl leading-tight text-gray-950 sm:text-7xl">Contact Us</h1>

        <div className="mt-16 w-full max-w-md space-y-9">
          {contactItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center justify-center gap-5 text-2xl font-medium text-gray-500 transition hover:text-gray-950 sm:text-3xl"
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
              >
                <Icon className="h-9 w-9 flex-none stroke-[1.7]" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
