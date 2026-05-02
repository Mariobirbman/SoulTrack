export interface OrderItem {
  productId: string
  nameSnapshot: string
  priceSnapshot: number
  qty: number
  image?: string | null
}

export interface VendorOrder {
  checkoutId: string
  status: string
  buyerUid: string
  buyerEmail?: string | null
  vendorUid: string
  vendorName?: string
  pickupName?: string
  pickupEmail?: string
  pickupPreferredDateTime?: string
  notes?: string
  items: OrderItem[]
  createdAt?: any
  subtotal?: number
  agreedPrice?: number
}
