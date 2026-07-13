export type ShippingLocationCountry = {
  name: string;
  regions: Array<{
    name: string;
    cities: string[];
  }>;
};

export const shippingLocationCountries: ShippingLocationCountry[] = [
  {
    name: "Ghana",
    regions: [
      { name: "Ahafo", cities: ["Goaso", "Bechem", "Duayaw Nkwanta"] },
      { name: "Ashanti", cities: ["Kumasi", "Obuasi", "Ejisu", "Mampong", "Konongo"] },
      { name: "Bono", cities: ["Sunyani", "Berekum", "Dormaa Ahenkro", "Wenchi"] },
      { name: "Bono East", cities: ["Techiman", "Kintampo", "Atebubu", "Nkoranza"] },
      { name: "Central", cities: ["Cape Coast", "Kasoa", "Winneba", "Elmina", "Mankessim"] },
      { name: "Eastern", cities: ["Koforidua", "Akosombo", "Aburi", "Nkawkaw", "Akim Oda"] },
      { name: "Greater Accra", cities: ["Accra", "Tema", "Madina", "Adenta", "Ashaiman", "Teshie", "Nungua"] },
      { name: "North East", cities: ["Nalerigu", "Gambaga", "Walewale"] },
      { name: "Northern", cities: ["Tamale", "Yendi", "Savelugu"] },
      { name: "Oti", cities: ["Dambai", "Kete Krachi", "Jasikan"] },
      { name: "Savannah", cities: ["Damongo", "Bole", "Salaga"] },
      { name: "Upper East", cities: ["Bolgatanga", "Bawku", "Navrongo"] },
      { name: "Upper West", cities: ["Wa", "Lawra", "Tumu"] },
      { name: "Volta", cities: ["Ho", "Hohoe", "Keta", "Aflao"] },
      { name: "Western", cities: ["Sekondi-Takoradi", "Tarkwa", "Axim"] },
      { name: "Western North", cities: ["Sefwi Wiawso", "Bibiani", "Enchi"] },
    ],
  },
  {
    name: "Nigeria",
    regions: [
      { name: "Lagos", cities: ["Lagos", "Ikeja", "Lekki", "Epe"] },
      { name: "Abuja FCT", cities: ["Abuja", "Gwagwalada", "Kuje"] },
      { name: "Oyo", cities: ["Ibadan", "Ogbomoso"] },
      { name: "Rivers", cities: ["Port Harcourt", "Bonny"] },
    ],
  },
  {
    name: "United Kingdom",
    regions: [
      { name: "England", cities: ["London", "Manchester", "Birmingham", "Liverpool", "Leeds"] },
      { name: "Scotland", cities: ["Edinburgh", "Glasgow", "Aberdeen"] },
      { name: "Wales", cities: ["Cardiff", "Swansea"] },
      { name: "Northern Ireland", cities: ["Belfast", "Derry"] },
    ],
  },
  {
    name: "United States",
    regions: [
      { name: "California", cities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento"] },
      { name: "New York", cities: ["New York City", "Buffalo", "Albany"] },
      { name: "Texas", cities: ["Houston", "Dallas", "Austin", "San Antonio"] },
      { name: "Florida", cities: ["Miami", "Orlando", "Tampa"] },
    ],
  },
  {
    name: "Canada",
    regions: [
      { name: "Ontario", cities: ["Toronto", "Ottawa", "Hamilton"] },
      { name: "Quebec", cities: ["Montreal", "Quebec City"] },
      { name: "British Columbia", cities: ["Vancouver", "Victoria"] },
      { name: "Alberta", cities: ["Calgary", "Edmonton"] },
    ],
  },
  {
    name: "South Africa",
    regions: [
      { name: "Gauteng", cities: ["Johannesburg", "Pretoria", "Soweto"] },
      { name: "Western Cape", cities: ["Cape Town", "Stellenbosch"] },
      { name: "KwaZulu-Natal", cities: ["Durban", "Pietermaritzburg"] },
    ],
  },
];

export const getShippingRegions = (country: string) =>
  shippingLocationCountries.find((item) => item.name === country)?.regions ?? [];

export const getShippingCities = (country: string, region: string) =>
  getShippingRegions(country).find((item) => item.name === region)?.cities ?? [];
