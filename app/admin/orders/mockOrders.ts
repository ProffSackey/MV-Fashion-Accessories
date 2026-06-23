interface Order {
  id: string;
  customer: string;
  email: string;
  phone: string;
  items: number;
  amount: string;
  status: "Delivered" | "Processing" | "Shipped" | "Cancelled";
  payment: "Paid" | "Refunded" | "Pending";
  date: string;
  itemsList?: { name: string; qty: number; price: string }[];
  shippingAddress?: string;
  subtotal?: string;
  shippingCost?: string;
  tax?: string;
  total?: string;
  itemsDetail?: Array<{ productId: string; quantity: number; price: number; name?: string; image?: string }>;
}

const mockOrders: Order[] = [
  {
    id: "ORD-001",
    customer: "John Doe",
    email: "john@example.com",
    phone: "123-456-7890",
    items: 2,
    amount: "GHS 99.98",
    status: "Processing",
    payment: "Paid",
    date: "2024-01-15",
    itemsDetail: [
      { productId: "1", quantity: 1, price: 49.99, name: "Product A" },
      { productId: "2", quantity: 1, price: 50.00, name: "Product B" }
    ],
    shippingAddress: "123 Main St, City, State 12345"
  },
  {
    id: "ORD-002",
    customer: "Jane Smith",
    email: "jane@example.com",
    phone: "098-765-4321",
    items: 1,
    amount: "GHS 29.99",
    status: "Shipped",
    payment: "Pending",
    date: "2024-01-14",
    itemsDetail: [
      { productId: "3", quantity: 1, price: 29.99, name: "Product C" }
    ],
    shippingAddress: "456 Oak Ave, Town, State 67890"
  }
];

export default mockOrders;
export type { Order };
