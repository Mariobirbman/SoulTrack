<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getBrandStat, getDelta, type BrandStat } from '@/lib/useBrandStats'
import { deltaLabel as formatDeltaLabel, priceColorClass } from '@/lib/marketIntel'
import { useRouter } from 'vue-router'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useAuth } from '@/lib/auth'
import { db, demoMode, firebaseConfigured } from '@/lib/firebase'
import { isAuthBypassEnabled } from '@/lib/runtimeFlags'
import {
  addDemoSampleListings,
  deleteDemoProduct,
  getOrSeedDemoProducts,
  getOrSeedDemoVendor,
  saveDemoVendor,
  upsertDemoProduct,
} from '@/lib/demoStore'

type VendorProfile = {
  name: string
  location?: string
  description?: string
  contactEmail?: string
  minOrder?: number
}

type ProductDoc = {
  vendorUid: string
  vendorName: string
  name: string
  brand?: string
  model?: string
  size?: string
  price: number
  condition?: string
  image?: string
  images?: string[]
  description?: string
  colorway?: string
  sku?: string
  active?: boolean
  status?: string
}

type GalleryOption = {
  key: string
  src: string
  kind: 'upload' | 'url'
  uploadIndex?: number
}

const BRAND_OPTIONS = ['Nike', 'Jordan', 'Adidas', 'New Balance', 'Puma', 'Reebok', 'Yeezy', 'ASICS', 'Converse', 'Other'] as const

const BRAND_MODELS: Record<string, string[]> = {
  Nike: ['Dunk Low', 'Dunk High', 'Air Force 1', 'Air Max 1', 'Air Max 90', 'Air Max 95', 'Air Max Plus', 'Zoom Vomero 5', 'Cortez', 'SB Dunk'],
  Jordan: ['Air Jordan 1', 'Air Jordan 3', 'Air Jordan 4', 'Air Jordan 5', 'Air Jordan 6', 'Air Jordan 11', 'Air Jordan 12', 'Air Jordan 13', 'Jordan 1 Low', 'Jordan 1 Mid'],
  Adidas: ['Yeezy Boost 350', 'Yeezy Boost 700', 'Samba', 'Campus 00s', 'Gazelle', 'Forum Low', 'UltraBoost', 'Superstar', 'NMD', 'Stan Smith'],
  'New Balance': ['550', '574', '9060', '2002R', '1906R', '990v3', '990v4', '990v5', '992', '993'],
  Puma: ['Suede Classic', 'RS-X', 'MB.03', 'Clyde All-Pro', 'Palermo', 'Future Rider'],
  Reebok: ['Club C 85', 'Classic Leather', 'Question Mid', 'Answer IV', 'Nano X', 'Instapump Fury'],
  Yeezy: ['Boost 350 V2', 'Boost 700', 'Foam Runner', 'Slide', '500', '450'],
  ASICS: ['GEL-Kayano 14', 'GEL-1130', 'GEL-Lyte III', 'GEL-NYC', 'GT-2160', 'EX89'],
  Converse: ['Chuck Taylor All Star', 'Chuck 70', 'One Star', 'Run Star Hike', 'Weapon', 'Pro Leather'],
  Other: [],
}

const COMMON_SIZES = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'] as const
const MAX_IMAGES = 6
const DEFAULT_IMAGE = '/images/shoes/pexels-jonathanborba-12031204.jpg'

const router = useRouter()
const { user, ready } = useAuth()

const status = ref('')
const error = ref('')

const vendorExists = ref(false)
const vendor = ref<VendorProfile>({
  name: '',
  location: '',
  description: '',
  contactEmail: '',
  minOrder: 1,
})

const products = ref<Array<{ id: string } & ProductDoc>>([])
const editingId = ref<string | null>(null)

const productForm = ref({
  name: '',
  brand: 'Nike',
  model: '',
  size: '',
  price: 0,
  condition: 'New',
  imageUrl: '',
  uploadedImages: [] as string[],
  coverKey: '',
  description: '',
  colorway: '',
  sku: '',
  active: true,
})

const customBrand = ref('')
const selectedModelPreset = ref('')
const fileInputEl = ref<HTMLInputElement | null>(null)
const dragActive = ref(false)
const uploadBusy = ref(false)
const authBypass = isAuthBypassEnabled()

const uid = computed(() => user.value?.uid ?? '')
const canUseMarketplace = computed(() => (demoMode ? !!uid.value : firebaseConfigured && !!db && !!uid.value))

const currentBrandStat = ref<BrandStat | null>(null)
const marketDelta = ref<number | null>(null)

function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

const resolvedBrand = computed(() => {
  if (productForm.value.brand === 'Other') return customBrand.value.trim()
  return productForm.value.brand.trim()
})

const modelSuggestions = computed(() => BRAND_MODELS[productForm.value.brand] ?? [])

const previewName = computed(() => {
  const explicitName = productForm.value.name.trim()
  if (explicitName) return explicitName
  return [resolvedBrand.value, productForm.value.model.trim()].filter(Boolean).join(' ')
})

const galleryOptions = computed<GalleryOption[]>(() => {
  const uploads = productForm.value.uploadedImages
    .map((src, index) => ({ key: `upload-${index}`, src, kind: 'upload' as const, uploadIndex: index }))

  const url = productForm.value.imageUrl.trim()
  if (!url) return uploads

  const duplicateOfUpload = uploads.some((entry) => entry.src === url)
  if (duplicateOfUpload) return uploads

  return [...uploads, { key: 'url-fallback', src: url, kind: 'url' as const }]
})

const previewImage = computed(() => resolveCoverImage() || DEFAULT_IMAGE)

watch(
  () => productForm.value.brand,
  () => {
    selectedModelPreset.value = ''
    if (productForm.value.brand !== 'Other') customBrand.value = ''
  },
)

watch(galleryOptions, (options) => {
  if (!options.length) {
    productForm.value.coverKey = ''
    return
  }
  if (!options.some((o) => o.key === productForm.value.coverKey)) {
    productForm.value.coverKey = options[0]?.key ?? ''
  }
})

let stopVendorListener: (() => void) | null = null
let stopProductsListener: (() => void) | null = null

onMounted(() => {
  ;(async () => {
    await ready
    if (demoMode) {
      if (!user.value && !authBypass) {
        router.push('/login')
        return
      }
      vendorExists.value = true
      vendor.value = getOrSeedDemoVendor()
      products.value = (getOrSeedDemoProducts()
        .filter((p) => !user.value || p.vendorUid === user.value.uid) as any)
        .sort((a: any, b: any) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
      return
    }

    if (!firebaseConfigured || !db) {
      error.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable selling.'
      return
    }
    if (!user.value && !authBypass) {
      router.push('/login')
      return
    }
    if (!user.value) {
      error.value = 'Auth bypass is on. Some seller actions are disabled without a live user session.'
      return
    }

    const vendorRef = doc(db, 'vendors', user.value.uid)
    stopVendorListener = onSnapshot(
      vendorRef,
      (snap) => {
        vendorExists.value = snap.exists()
        if (!snap.exists()) {
          vendor.value = {
            name: user.value?.displayName || '',
            location: '',
            description: '',
            contactEmail: user.value?.email || '',
            minOrder: 1,
          }
          return
        }
        const data = snap.data() as Partial<VendorProfile>
        vendor.value = {
          name: String(data.name ?? ''),
          location: data.location ? String(data.location) : '',
          description: data.description ? String(data.description) : '',
          contactEmail: data.contactEmail ? String(data.contactEmail) : (user.value?.email || ''),
          minOrder: typeof data.minOrder === 'number' ? data.minOrder : 1,
        }
      },
      () => {
        error.value = 'Could not load your vendor profile.'
      },
    )

    const q = query(collection(db, 'products'), where('vendorUid', '==', user.value.uid))
    stopProductsListener = onSnapshot(
      q,
      (snap) => {
        products.value = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as ProductDoc) }))
          .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
      },
      () => {
        error.value = 'Could not load your products.'
      },
    )
  })()
})

watch(
  [resolvedBrand, () => Number(productForm.value.price)],
  async ([brand, price]) => {
    currentBrandStat.value = await getBrandStat(brand)
    marketDelta.value = await getDelta(price, brand)
  },
  { immediate: true },
)

const sellerDeltaText = computed(() => {
  const currentPrice = Number(productForm.value.price)
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return ''
  if (marketDelta.value === null) return ''
  if (marketDelta.value === 0) return 'Your price is at market'
  return `Your price is ${formatDeltaLabel(marketDelta.value).toLowerCase()}`
})

const sellerDeltaClass = computed(() => (marketDelta.value === null ? '' : priceColorClass(marketDelta.value)))

onBeforeUnmount(() => {
  stopVendorListener?.()
  stopProductsListener?.()
})

function openFilePicker() {
  fileInputEl.value?.click()
}

function onFilesPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return
  void addLocalFiles(files)
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragActive.value = false
  const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  if (!files.length) return
  void addLocalFiles(files)
}

function onDragOver() {
  dragActive.value = true
}

function onDragLeave() {
  dragActive.value = false
}

async function addLocalFiles(files: File[]) {
  error.value = ''
  status.value = ''

  const remaining = MAX_IMAGES - productForm.value.uploadedImages.length
  if (remaining <= 0) {
    error.value = `You can upload up to ${MAX_IMAGES} images.`
    return
  }

  const imageFiles = files.filter((f) => f.type.startsWith('image/')).slice(0, remaining)
  if (!imageFiles.length) {
    error.value = 'Please choose image files only.'
    return
  }

  uploadBusy.value = true
  const nextImages: string[] = []
  for (const file of imageFiles) {
    try {
      const encoded = await compressImage(file)
      nextImages.push(encoded)
    } catch {
      // Skip unreadable files and continue with the rest.
    }
  }
  uploadBusy.value = false

  if (!nextImages.length) {
    error.value = 'Could not read the selected image files.'
    return
  }

  productForm.value.uploadedImages.push(...nextImages)
  if (!productForm.value.coverKey) {
    productForm.value.coverKey = 'upload-0'
  }

  if (files.length > imageFiles.length) {
    status.value = `Added ${nextImages.length} image(s). Max ${MAX_IMAGES} images per listing.`
  } else {
    status.value = `Added ${nextImages.length} image(s).`
  }
}

function removeUpload(index: number) {
  productForm.value.uploadedImages.splice(index, 1)
}

function clearUploads() {
  productForm.value.uploadedImages = []
}

function removeImageUrl() {
  productForm.value.imageUrl = ''
}

function setCover(key: string) {
  productForm.value.coverKey = key
}

function applyModelPreset() {
  if (!selectedModelPreset.value) return
  productForm.value.model = selectedModelPreset.value
}

function dedupeStrings(values: string[]) {
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    if (!out.includes(trimmed)) out.push(trimmed)
  }
  return out
}

function resolveCoverImage() {
  const options = galleryOptions.value
  if (!options.length) return ''
  const chosen = options.find((entry) => entry.key === productForm.value.coverKey)
  return chosen?.src ?? options[0]?.src ?? ''
}

function collectMedia() {
  const uploads = productForm.value.uploadedImages.map((src) => src.trim()).filter(Boolean)
  const urlFallback = productForm.value.imageUrl.trim()

  const all = dedupeStrings([
    ...uploads,
    ...(urlFallback ? [urlFallback] : []),
  ])

  let cover = resolveCoverImage()
  if (!cover && all.length) cover = all[0] ?? ''
  if (!cover) return { cover: '', images: [] as string[] }

  const ordered = [...all]
  const coverIndex = ordered.indexOf(cover)
  if (coverIndex > 0) {
    const chosen = ordered.splice(coverIndex, 1)[0]
    if (chosen) ordered.unshift(chosen)
  } else if (coverIndex < 0) {
    ordered.unshift(cover)
  }

  return { cover, images: ordered }
}

function fmtPricePreview(price: number) {
  if (!Number.isFinite(price) || price <= 0) return '-'
  return String(Math.round(price))
}


async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file)
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  const maxDimension = 1400
  const baseW = Math.max(1, img.width)
  const baseH = Math.max(1, img.height)
  const scale = Math.min(1, maxDimension / Math.max(baseW, baseH))
  canvas.width = Math.max(1, Math.round(baseW * scale))
  canvas.height = Math.max(1, Math.round(baseH * scale))
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  if (file.type === 'image/png') {
    return canvas.toDataURL('image/png')
  }
  return canvas.toDataURL('image/jpeg', 0.86)
}

async function saveVendor() {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value || !user.value) return
  if (!vendor.value.name.trim()) {
    error.value = 'Shop name is required.'
    return
  }

  if (demoMode) {
    const v = {
      name: vendor.value.name.trim(),
      location: (vendor.value.location ?? '').trim(),
      description: (vendor.value.description ?? '').trim(),
      contactEmail: (vendor.value.contactEmail ?? '').trim(),
      minOrder: Math.max(1, Number(vendor.value.minOrder ?? 1) || 1),
    }
    vendor.value = v
    saveDemoVendor(v)
    status.value = 'Vendor profile saved (demo mode).'
    return
  }

  if (!db) return
  try {
    const payload: Record<string, unknown> = {
      name: vendor.value.name.trim(),
      location: (vendor.value.location ?? '').trim(),
      description: (vendor.value.description ?? '').trim(),
      contactEmail: (vendor.value.contactEmail ?? '').trim(),
      minOrder: Math.max(1, Number(vendor.value.minOrder ?? 1) || 1),
      updatedAt: serverTimestamp(),
    }
    if (!vendorExists.value) payload.createdAt = serverTimestamp()

    await setDoc(doc(db, 'vendors', user.value.uid), payload, { merge: true })
    status.value = 'Vendor profile saved.'
  } catch {
    error.value = 'Could not save your vendor profile.'
  }
}

function resetProductForm() {
  editingId.value = null
  selectedModelPreset.value = ''
  customBrand.value = ''
  productForm.value = {
    name: '',
    brand: 'Nike',
    model: '',
    size: '',
    price: 0,
    condition: 'New',
    imageUrl: '',
    uploadedImages: [],
    coverKey: '',
    description: '',
    colorway: '',
    sku: '',
    active: true,
  }
}

function startEdit(p: { id: string } & ProductDoc) {
  editingId.value = p.id

  const storedImages = Array.isArray((p as any).images)
    ? (p as any).images.map((src: unknown) => String(src)).filter(Boolean)
    : []
  const legacyImage = p.image ? String(p.image) : ''
  const uploads = dedupeStrings([
    ...storedImages,
    ...(legacyImage && !storedImages.includes(legacyImage) ? [legacyImage] : []),
  ])

  let nextBrand = String(p.brand ?? '')
  let nextCustomBrand = ''
  if (!BRAND_OPTIONS.includes(nextBrand as any)) {
    nextCustomBrand = nextBrand
    nextBrand = 'Other'
  }

  const coverKey = (() => {
    if (!legacyImage) return uploads.length ? 'upload-0' : ''
    const idx = uploads.indexOf(legacyImage)
    if (idx >= 0) return `upload-${idx}`
    return uploads.length ? 'upload-0' : ''
  })()

  productForm.value = {
    name: String(p.name ?? ''),
    brand: nextBrand || 'Nike',
    model: String((p as any).model ?? ''),
    size: String(p.size ?? ''),
    price: Number(p.price ?? 0),
    condition: String(p.condition ?? 'New'),
    imageUrl: '',
    uploadedImages: uploads,
    coverKey,
    description: String(p.description ?? ''),
    colorway: String((p as any).colorway ?? ''),
    sku: String((p as any).sku ?? ''),
    active: p.active !== false,
  }
  customBrand.value = nextCustomBrand
  selectedModelPreset.value = modelSuggestions.value.includes(productForm.value.model) ? productForm.value.model : ''
  status.value = ''
  error.value = ''
}

async function saveProduct() {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value || !user.value) return

  if (!vendor.value.name.trim()) {
    error.value = 'Save your vendor profile (shop name) before listing products.'
    return
  }

  const brand = resolvedBrand.value
  if (!brand) {
    error.value = 'Choose a brand. If you selected Other, enter a custom brand name.'
    return
  }

  const model = productForm.value.model.trim()
  const explicitName = productForm.value.name.trim()
  const derivedName = explicitName || [brand, model].filter(Boolean).join(' ')
  if (!derivedName) {
    error.value = 'Add a model, or enter a listing title.'
    return
  }

  const price = Number(productForm.value.price)
  if (!Number.isFinite(price) || price <= 0) {
    error.value = 'Enter a valid price.'
    return
  }

  const media = collectMedia()
  const isNew = !editingId.value
  const basePayload: Record<string, unknown> = {
    vendorUid: user.value.uid,
    vendorName: vendor.value.name.trim(),
    name: derivedName,
    brand,
    model,
    size: (productForm.value.size ?? '').trim(),
    price,
    condition: (productForm.value.condition ?? '').trim(),
    image: media.cover || '',
    images: media.images,
    description: (productForm.value.description ?? '').trim(),
    colorway: (productForm.value.colorway ?? '').trim(),
    sku: (productForm.value.sku ?? '').trim(),
    // New listings start as pending — admin must approve before Browse shows them
    ...(isNew
      ? { active: false, status: 'pending' }
      : {}),
  }

  if (demoMode) {
    const demoPayload: Record<string, unknown> = { ...basePayload }
    if (!isNew) {
      const existing = products.value.find((p) => p.id === editingId.value)
      demoPayload.active = (existing as any)?.active ?? false
      demoPayload.status = (existing as any)?.status ?? 'pending'
    }
    const next = upsertDemoProduct({ id: editingId.value ?? undefined, ...(demoPayload as any) })
    products.value = (next.filter((p) => p.vendorUid === user.value!.uid) as any).sort((a: any, b: any) =>
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
    )
    status.value = editingId.value
      ? 'Listing updated.'
      : 'Listing submitted — pending admin approval before it appears in Browse.'
    resetProductForm()
    return
  }

  if (!db) return
  try {
    const payload: Record<string, unknown> = { ...basePayload, updatedAt: serverTimestamp() }
    const vendorPayload: Record<string, unknown> = {
      name: vendor.value.name.trim(),
      location: (vendor.value.location ?? '').trim(),
      description: (vendor.value.description ?? '').trim(),
      contactEmail: (vendor.value.contactEmail ?? '').trim(),
      minOrder: Math.max(1, Number(vendor.value.minOrder ?? 1) || 1),
      updatedAt: serverTimestamp(),
    }
    if (!vendorExists.value) vendorPayload.createdAt = serverTimestamp()
    await setDoc(doc(db, 'vendors', user.value.uid), vendorPayload, { merge: true })

    if (editingId.value) {
      await updateDoc(doc(db, 'products', editingId.value), payload)
      status.value = 'Listing updated.'
    } else {
      await addDoc(collection(db, 'products'), {
        ...payload,
        createdAt: serverTimestamp(),
      })
      status.value = 'Listing submitted — pending admin approval before it appears in Browse.'
    }
    resetProductForm()
  } catch {
    error.value = 'Could not save product.'
  }
}

async function markAsSold(id: string) {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value) return

  if (demoMode) {
    const current = products.value.find((p) => p.id === id)
    if (!current) return
    const next = upsertDemoProduct({ ...(current as any), status: 'sold', active: false })
    products.value = (next.filter((p: any) => p.vendorUid === uid.value) as any).sort((a: any, b: any) =>
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
    )
    status.value = 'Marked as sold (demo mode).'
    return
  }

  if (!db) return
  try {
    await updateDoc(doc(db, 'products', id), { status: 'sold', active: false, updatedAt: serverTimestamp() })
    status.value = 'Listing marked as sold.'
  } catch {
    error.value = 'Could not update listing.'
  }
}

async function markAsActive(id: string) {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value) return

  if (demoMode) {
    const current = products.value.find((p) => p.id === id)
    if (!current) return
    const next = upsertDemoProduct({ ...(current as any), status: 'active', active: true })
    products.value = (next.filter((p: any) => p.vendorUid === uid.value) as any).sort((a: any, b: any) =>
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
    )
    status.value = 'Marked as active (demo mode).'
    return
  }

  if (!db) return
  try {
    await updateDoc(doc(db, 'products', id), { status: 'active', active: true, updatedAt: serverTimestamp() })
    status.value = 'Listing marked as active.'
  } catch {
    error.value = 'Could not update listing.'
  }
}

async function removeProduct(id: string) {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value) return

  if (demoMode) {
    const next = deleteDemoProduct(id)
    products.value = (next.filter((p) => p.vendorUid === uid.value) as any).sort((a: any, b: any) =>
      String(a.name ?? '').localeCompare(String(b.name ?? '')),
    )
    status.value = 'Product removed (demo mode).'
    return
  }

  if (!db) return
  try {
    await deleteDoc(doc(db, 'products', id))
    status.value = 'Product removed.'
  } catch {
    error.value = 'Could not remove product.'
  }
}

async function addSampleListings() {
  status.value = ''
  error.value = ''
  if (!canUseMarketplace.value || !user.value) return
  if (!vendor.value.name.trim()) {
    error.value = 'Save your vendor profile (shop name) first.'
    return
  }

  try {
    if (demoMode) {
      const next = addDemoSampleListings(user.value.uid, vendor.value.name.trim())
      products.value = (next.filter((p) => p.vendorUid === uid.value) as any).sort((a: any, b: any) =>
        String(a.name ?? '').localeCompare(String(b.name ?? '')),
      )
      status.value = 'Sample listings added and visible in Browse (demo mode).'
      return
    }

    if (!db) return
    const samples = [
      {
        name: 'Nike Dunk Low Retro',
        brand: 'Nike',
        model: 'Dunk Low',
        size: '10',
        price: 165,
        condition: 'New',
        image: '/images/shoes/pexels-dl-nike-dunk-20298285.jpg',
        images: ['/images/shoes/pexels-dl-nike-dunk-20298285.jpg'],
        description: 'Clean, ready for pickup. Box included.',
      },
      {
        name: 'Air Jordan 1 Retro High OG',
        brand: 'Jordan',
        model: 'Air Jordan 1',
        size: '10.5',
        price: 305,
        condition: 'DS',
        image: '/images/shoes/pexels-dl-jordan-11281577.jpg',
        images: ['/images/shoes/pexels-dl-jordan-11281577.jpg'],
        description: 'Deadstock, never worn. Local pickup only.',
      },
      {
        name: 'New Balance 550 White Green',
        brand: 'New Balance',
        model: '550',
        size: '9.5',
        price: 140,
        condition: 'New',
        image: '/images/shoes/pexels-dl-nb-19882433.jpg',
        images: ['/images/shoes/pexels-dl-nb-19882433.jpg'],
        description: 'Brand new pair. Great starter flip.',
      },
    ]

    for (const sample of samples) {
      await addDoc(collection(db, 'products'), {
        vendorUid: user.value.uid,
        vendorName: vendor.value.name.trim(),
        ...sample,
        active: true,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    status.value = 'Sample listings added.'
  } catch {
    error.value = 'Could not add sample listings.'
  }
}

function listingImage(p: ProductDoc) {
  const imgs = Array.isArray((p as any).images)
    ? (p as any).images.map((src: unknown) => String(src)).filter(Boolean)
    : []
  return imgs[0] || p.image || DEFAULT_IMAGE
}
</script>

<template>
  <div class="sell-page">
    <div class="page-header">
      <div>
        <h1 class="title">Sell on <span class="accent">SoleTrack</span></h1>
        <p class="sub">Set up your shop and list sneakers for pickup.</p>
      </div>
      <div class="head-actions">
        <router-link v-if="uid" class="btn" :to="`/vendor/${uid}`">View shop</router-link>
        <router-link v-if="uid" class="btn" to="/vendor-orders">Orders</router-link>
      </div>
    </div>

    <div v-if="error" class="notice error">{{ error }}</div>
    <div v-if="status" class="notice ok">{{ status }}</div>

    <section class="card vendor-card">
      <div class="card-head">
        <span class="card-label">Shop profile</span>
        <button class="btn sm primary" :disabled="!canUseMarketplace" @click="saveVendor">Save</button>
      </div>
      <div class="vendor-grid">
        <div class="field">
          <label for="vendor-name">Shop name</label>
          <input id="vendor-name" name="vendorName" v-model="vendor.name" type="text" placeholder="Your shop name" />
        </div>
        <div class="field">
          <label for="vendor-location">Location</label>
          <input id="vendor-location" name="vendorLocation" v-model="vendor.location" type="text" placeholder="City, State" />
        </div>
        <div class="field">
          <label for="vendor-email">Contact email</label>
          <input id="vendor-email" name="vendorEmail" v-model="vendor.contactEmail" type="email" placeholder="you@example.com" />
        </div>
        <div class="field">
          <label for="vendor-min-order">Min order (pairs)</label>
          <input id="vendor-min-order" name="vendorMinOrder" v-model="vendor.minOrder" type="number" min="1" />
        </div>
        <div class="field full">
          <label for="vendor-description">About your shop</label>
          <textarea id="vendor-description" name="vendorDescription" v-model="vendor.description" rows="2" placeholder="What do you sell? Pickup hours? Specialties?" />
        </div>
      </div>
    </section>

    <section class="card listing-card">
      <div class="card-head">
        <span class="card-label">{{ editingId ? 'Edit listing' : 'New listing' }}</span>
        <button class="btn sm" :disabled="!canUseMarketplace" @click="addSampleListings">Add samples</button>
      </div>

      <div class="listing-layout">
        <div class="listing-form">
          <div class="form-section-label">Sneaker details</div>
          <div class="form-grid">
            <div class="field">
              <label for="product-brand">Brand</label>
              <select id="product-brand" name="productBrand" v-model="productForm.brand">
                <option v-for="brand in BRAND_OPTIONS" :key="brand" :value="brand">{{ brand }}</option>
              </select>
            </div>

            <div v-if="productForm.brand === 'Other'" class="field">
              <label for="custom-brand">Custom brand</label>
              <input id="custom-brand" name="customBrand" v-model="customBrand" type="text" placeholder="Enter brand name" />
            </div>

            <div class="field field--preset">
              <label for="model-preset">Model presets</label>
              <select id="model-preset" name="modelPreset" v-model="selectedModelPreset" :disabled="!modelSuggestions.length" @change="applyModelPreset">
                <option value="">Choose popular model</option>
                <option v-for="model in modelSuggestions" :key="model" :value="model">{{ model }}</option>
              </select>
              <p class="field-help">Choose a preset to autofill the model, then fine-tune manually if needed.</p>
            </div>

            <div class="field full">
              <label for="product-model">Model (autocomplete + manual)</label>
              <input
                id="product-model"
                name="productModel"
                v-model="productForm.model"
                type="text"
                list="brand-model-options"
                placeholder="Type model name or pick a suggested option"
              />
              <datalist id="brand-model-options">
                <option v-for="model in modelSuggestions" :key="`model-${model}`" :value="model" />
              </datalist>
            </div>

            <div class="field full">
              <label for="listing-title">Listing title (optional)</label>
              <input
                id="listing-title"
                name="listingTitle"
                v-model="productForm.name"
                type="text"
                placeholder="Leave blank to auto-generate from brand + model"
              />
            </div>

            <div class="field">
              <label for="product-colorway">Colorway</label>
              <input id="product-colorway" name="productColorway" v-model="productForm.colorway" type="text" placeholder="e.g. Bred / Chicago" />
            </div>
            <div class="field">
              <label for="product-size">Size (US)</label>
              <div class="pill-row pill-row--sm">
                <button
                  v-for="size in COMMON_SIZES"
                  :key="size"
                  type="button"
                  class="pill-btn pill-btn--sm"
                  :class="{ active: productForm.size === size }"
                  @click="productForm.size = size"
                >{{ size }}</button>
              </div>
              <input id="product-size" name="productSize" v-model="productForm.size" type="text" placeholder="Other size (e.g. W9)" style="margin-top: 6px" />
            </div>
            <div class="field">
              <label for="product-sku">SKU / Style code</label>
              <input id="product-sku" name="productSku" v-model="productForm.sku" type="text" placeholder="555088-001" />
            </div>
          </div>

          <div v-if="currentBrandStat" class="market-intel">
            <p class="intel-title">Market Intel · {{ resolvedBrand }}</p>
            <div class="intel-row">
              <span class="intel-label">Avg Price</span>
              <span class="intel-val">${{ currentBrandStat.avgPrice }}</span>
              <span v-if="sellerDeltaText" class="intel-delta" :class="sellerDeltaClass">{{ sellerDeltaText }}</span>
            </div>
            <div class="intel-row">
              <span class="intel-label">Brand Sales</span>
              <span class="intel-val">{{ fmtNum(currentBrandStat.totalOrders) }} orders</span>
            </div>
            <div class="intel-row">
              <span class="intel-label">Top Category</span>
              <span class="intel-val">{{ currentBrandStat.topCategory }}</span>
            </div>
          </div>

          <div class="form-section-label section-gap">Pricing &amp; condition</div>
          <div class="form-grid">
            <div class="field">
              <label for="product-price">Asking price</label>
              <div class="price-wrap">
                <span class="price-prefix">$</span>
                <input id="product-price" name="productPrice" v-model="productForm.price" type="number" min="1" step="1" class="price-input" />
              </div>
            </div>
            <div class="field">
              <label>Condition</label>
              <div class="condition-row">
                <button
                  v-for="condition in ['DS', 'New', 'Used']"
                  :key="condition"
                  class="cond-btn"
                  :class="{ active: productForm.condition === condition }"
                  type="button"
                  @click="productForm.condition = condition"
                >{{ condition }}</button>
              </div>
            </div>
          </div>

          <div class="form-section-label section-gap">Images</div>
          <div class="media-stack">
            <div
              class="dropzone"
              :class="{ active: dragActive }"
              @dragover.prevent="onDragOver"
              @dragleave.prevent="onDragLeave"
              @drop.prevent="onDrop"
              @click="openFilePicker"
            >
              <input
                ref="fileInputEl"
                class="hidden-file-input"
                type="file"
                name="listingImages"
                aria-label="Upload listing images"
                accept="image/*"
                multiple
                @change="onFilesPicked"
              />
              <p class="drop-title">Drag and drop shoe photos</p>
              <p class="drop-sub">or click to upload up to {{ MAX_IMAGES }} images</p>
              <p v-if="uploadBusy" class="drop-progress">Processing images...</p>
            </div>

            <div class="media-actions">
              <button type="button" class="btn sm" @click="openFilePicker">Choose files</button>
              <button
                type="button"
                class="btn sm"
                :disabled="!productForm.uploadedImages.length"
                @click="clearUploads"
              >
                Remove uploads
              </button>
              <span class="media-count">{{ productForm.uploadedImages.length }}/{{ MAX_IMAGES }} uploaded</span>
            </div>

            <div class="field full">
              <label for="image-url-fallback">Image URL fallback (optional)</label>
              <input
                id="image-url-fallback"
                name="imageUrlFallback"
                v-model="productForm.imageUrl"
                type="url"
                placeholder="https://example.com/your-shoe.jpg"
              />
            </div>

            <div v-if="galleryOptions.length" class="gallery-grid">
              <div
                v-for="option in galleryOptions"
                :key="option.key"
                class="gallery-item"
                :class="{ cover: productForm.coverKey === option.key }"
              >
                <img :src="option.src" alt="Listing image preview" class="gallery-img" />
                <span class="gallery-tag">
                  {{ productForm.coverKey === option.key ? 'Cover image' : option.kind === 'url' ? 'URL fallback' : 'Upload' }}
                </span>
                <div class="gallery-actions">
                  <button type="button" class="btn sm" @click="setCover(option.key)">
                    {{ productForm.coverKey === option.key ? 'Cover' : 'Set cover' }}
                  </button>
                  <button
                    v-if="option.kind === 'upload'"
                    type="button"
                    class="btn sm danger"
                    @click="removeUpload(option.uploadIndex ?? 0)"
                  >
                    Remove
                  </button>
                  <button
                    v-else
                    type="button"
                    class="btn sm danger"
                    @click="removeImageUrl"
                  >
                    Remove URL
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="form-section-label section-gap">Description</div>
          <div class="form-grid">
            <div class="field full">
              <label for="product-description">Listing description</label>
              <textarea id="product-description" name="productDescription" v-model="productForm.description" rows="3" placeholder="Box included? Pickup location? Any flaws?" />
            </div>
          </div>

          <div class="form-footer">
            <p class="publish-note">Listings publish active immediately and appear in Browse.</p>
            <div class="form-actions">
              <button v-if="editingId" class="btn sm" @click="resetProductForm">Cancel</button>
              <button class="btn sm primary" :disabled="!canUseMarketplace" @click="saveProduct">
                {{ editingId ? 'Update listing' : 'List shoe' }}
              </button>
            </div>
          </div>
        </div>

        <div class="listing-preview">
          <div class="preview-label">Preview</div>
          <div class="preview-card">
            <div class="preview-img-wrap">
              <img class="preview-img" :src="previewImage" alt="listing preview" />
              <span class="preview-cond" :class="(productForm.condition || 'New').toLowerCase()">
                {{ productForm.condition || 'New' }}
              </span>
            </div>
            <div class="preview-body">
              <div class="preview-name">{{ previewName || 'Shoe name' }}</div>
              <div class="preview-meta">
                <span>{{ resolvedBrand || 'Brand' }}</span>
                <span v-if="productForm.model"> · {{ productForm.model }}</span>
                <span v-if="productForm.size"> · Size {{ productForm.size }}</span>
              </div>
              <div class="preview-price">${{ fmtPricePreview(Number(productForm.price)) }}</div>
              <div class="preview-shop">{{ vendor.name || 'Your shop' }}</div>
            </div>
          </div>
          <p class="preview-note">Cover image and details reflect how this listing shows in Browse.</p>
        </div>
      </div>
    </section>

    <section class="card listings-card">
      <div class="card-head">
        <span class="card-label">Your listings ({{ products.length }})</span>
      </div>

      <div v-if="products.length" class="listings-list">
        <div v-for="p in products" :key="p.id" class="listing-row">
          <img class="lr-img" :src="listingImage(p)" :alt="p.name" />
          <div class="lr-meta">
            <div class="lr-name">{{ p.name }}</div>
            <div class="lr-sub">
              {{ p.brand || '—' }}
              <template v-if="(p as any).model"> · {{ (p as any).model }}</template>
              <template v-if="(p as any).colorway"> · {{ (p as any).colorway }}</template>
              · Size {{ p.size || '—' }} · ${{ p.price }}
            </div>
            <div v-if="p.status === 'rejected'" class="hint-rejected">Unavailable.</div>
          </div>
          <div class="lr-right">
            <span class="status-badge" :class="p.status || 'active'">
              {{ p.status === 'rejected' ? 'Unavailable' : p.status === 'sold' ? 'Sold' : 'Active' }}
            </span>
            <button class="btn sm" @click="startEdit(p)" :disabled="p.status === 'sold'">Edit</button>
            <button v-if="p.status !== 'sold'" class="btn sm" @click="markAsSold(p.id)">Sold</button>
            <button v-else class="btn sm" @click="markAsActive(p.id)">Mark Active</button>
            <button class="btn sm danger" @click="removeProduct(p.id)">Delete</button>
          </div>
        </div>
      </div>

      <div v-else class="empty">No listings yet. Submit one above.</div>
    </section>
  </div>
</template>

<style scoped>
.sell-page { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.title { margin: 0; color: var(--text); font-size: clamp(1.3rem, 3vw, 1.9rem); font-weight: 900; }
.accent { color: var(--accent); }
.sub { margin: 5px 0 0; color: var(--muted); font-size: 0.9rem; }
.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.card {
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: 14px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}
.card-label {
  font-size: 1rem;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.01em;
}

.notice { border-radius: 6px; padding: 10px 12px; border: 1px solid; margin-bottom: 12px; font-size: 0.88rem; }
.notice.error { border-color: rgba(255, 50, 50, 0.35); color: var(--danger); background: rgba(255, 50, 50, 0.06); }
.notice.ok { border-color: rgba(80, 220, 120, 0.35); color: var(--success); background: rgba(80, 220, 120, 0.06); }

.vendor-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.vendor-grid .field.full { grid-column: 1 / -1; }
@media (max-width: 860px) { .vendor-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .vendor-grid { grid-template-columns: 1fr; } }

.field { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 0.78rem; color: var(--muted); font-weight: 600; }
.field input,
.field textarea,
.field select {
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.4;
  transition: border-color 0.15s;
}
.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.35);
  box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12);
}
.field textarea { resize: vertical; }
.field-help {
  margin: 2px 0 0;
  color: color-mix(in srgb, var(--muted) 88%, white 12%);
  font-size: 0.72rem;
  line-height: 1.35;
}

.field select {
  appearance: none;
  color-scheme: dark;
  background-image:
    linear-gradient(45deg, transparent 50%, color-mix(in srgb, var(--muted) 76%, white 24%) 50%),
    linear-gradient(135deg, color-mix(in srgb, var(--muted) 76%, white 24%) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 2px),
    calc(100% - 13px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 34px;
}
.field select:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.field select option {
  background: var(--surface-1);
  color: var(--text);
}
.field--preset {
  position: relative;
}

.listing-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 860px) { .listing-layout { grid-template-columns: 1fr; } }

.form-section-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.section-gap { margin-top: 14px; }

.market-intel { background: var(--surface-2, rgba(255,255,255,0.04)); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.intel-title  { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 8px; }
.intel-row    { display: flex; gap: 12px; align-items: baseline; margin-bottom: 4px; font-size: 0.9rem; }
.intel-label  { color: var(--muted); min-width: 90px; }
.intel-val    { font-weight: 600; }
.intel-delta  { font-size: 0.8rem; }
.price--great-deal { color: var(--success); font-weight: 600; }
.price--deal       { color: color-mix(in srgb, var(--success) 70%, transparent); }
.price--premium    { color: #f5a623; }
.price--high       { color: var(--error, #e55); }

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.form-grid .field.full { grid-column: 1 / -1; }
@media (max-width: 560px) { .form-grid { grid-template-columns: 1fr; } }

.pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pill-row--sm { gap: 4px; }
.pill-btn {
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.pill-btn:hover { border-color: rgba(var(--accent-rgb), 0.25); color: var(--text); }
.pill-btn.active {
  border-color: rgba(var(--accent-rgb), 0.5);
  color: var(--text);
  background: rgba(var(--accent-rgb), 0.06);
}
.pill-btn--sm { padding: 3px 9px; font-size: 0.75rem; }

.price-wrap {
  display: flex;
  align-items: center;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  overflow: hidden;
  transition: border-color 0.15s;
}
.price-wrap:focus-within { border-color: rgba(var(--accent-rgb), 0.35); }
.price-prefix {
  padding: 9px 0 9px 12px;
  color: var(--accent);
  font-weight: 900;
  font-size: 0.95rem;
  line-height: 1;
  user-select: none;
}
.price-input {
  border: none !important;
  background: transparent !important;
  padding: 9px 12px 9px 6px !important;
  flex: 1;
  min-width: 0;
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 700;
  border-radius: 0 !important;
}
.price-input:focus { outline: none; }

.condition-row { display: flex; gap: 8px; }
.cond-btn {
  flex: 1;
  padding: 9px 6px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s, box-shadow 0.2s;
}
.cond-btn:hover {
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--text);
  background: rgba(var(--accent-rgb), 0.04);
}
.cond-btn.active {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.1);
  box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.12);
}

.media-stack { display: grid; gap: 12px; }
.dropzone {
  border: 2px dashed rgba(var(--accent-rgb), 0.25);
  border-radius: 14px;
  padding: 28px 20px;
  background: rgba(var(--accent-rgb), 0.02);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.dropzone:hover,
.dropzone.active {
  border-color: rgba(var(--accent-rgb), 0.55);
  background: rgba(var(--accent-rgb), 0.06);
  box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.08);
}
.drop-title {
  margin: 0;
  color: var(--text);
  font-weight: 900;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
}
.drop-sub {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 0.82rem;
}
.drop-progress {
  margin: 10px 0 0;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 700;
  animation: pulse-text 1s ease-in-out infinite;
}
@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.hidden-file-input { display: none; }

.media-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.media-count { color: var(--muted); font-size: 0.76rem; margin-left: auto; }

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.gallery-item {
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.gallery-item:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
}
.gallery-item.cover {
  border-color: rgba(var(--accent-rgb), 0.6);
  box-shadow: 0 0 14px rgba(var(--accent-rgb), 0.15);
}
.gallery-img {
  width: 100%;
  height: 96px;
  object-fit: cover;
  display: block;
}
.gallery-tag {
  display: block;
  padding: 4px 8px 0;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--muted);
}
.gallery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.07);
  flex-wrap: wrap;
}
.publish-note { margin: 0; color: var(--muted); font-size: 0.8rem; }
.form-actions { display: flex; gap: 8px; }

.preview-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.preview-card {
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(var(--accent-rgb), 0.06) inset;
  transition: box-shadow 0.25s;
  position: sticky;
  top: 80px;
}
.preview-card:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(var(--accent-rgb), 0.08);
}
.preview-img-wrap { position: relative; overflow: hidden; }
.preview-img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}
.preview-card:hover .preview-img { transform: scale(1.03); }
.preview-cond {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: var(--text);
  letter-spacing: 0.04em;
}
.preview-cond.ds { color: var(--accent); border: 1px solid rgba(var(--accent-rgb), 0.3); }
.preview-cond.new { color: #7ecfff; border: 1px solid rgba(126, 207, 255, 0.3); }
.preview-cond.used { color: var(--muted); }
.preview-body { padding: 14px 14px 16px; }
.preview-name { font-weight: 900; color: var(--text); font-size: 1rem; margin-bottom: 4px; letter-spacing: -0.015em; }
.preview-meta { font-size: 0.8rem; color: var(--muted); margin-bottom: 8px; }
.preview-price { font-size: 1.25rem; font-weight: 900; color: var(--accent); margin-bottom: 4px; letter-spacing: -0.02em; }
.preview-shop { font-size: 0.75rem; color: var(--muted); }
.preview-note { font-size: 0.72rem; color: var(--muted); margin-top: 10px; line-height: 1.5; opacity: 0.7; }

.listings-card { margin-top: 16px; }
.listings-list { display: grid; gap: 10px; margin-top: 4px; }
.listing-row {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.listing-row:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.02);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
@media (max-width: 600px) {
  .listing-row { grid-template-columns: 68px 1fr; }
  .lr-right { grid-column: 1 / -1; justify-content: flex-start; }
}
.lr-img {
  width: 84px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  transition: border-color 0.2s;
}
.listing-row:hover .lr-img { border-color: rgba(var(--accent-rgb), 0.28); }
.lr-meta { min-width: 0; }
.lr-name { font-weight: 900; color: var(--text); font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lr-sub { font-size: 0.8rem; color: var(--muted); margin-top: 3px; }
.hint-rejected { font-size: 0.75rem; color: var(--danger); margin-top: 3px; }
.lr-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

.status-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
  background: rgba(var(--accent-rgb), 0.07);
  white-space: nowrap;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.status-badge.rejected { border-color: rgba(255, 50, 50, 0.35); color: var(--danger); background: rgba(255, 50, 50, 0.07); }
.status-badge.sold { border-color: rgba(150, 150, 150, 0.2); color: var(--muted); background: transparent; }

.btn {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-weight: 800;
  font-size: 0.88rem;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: border-color 0.15s, background 0.15s;
}
.btn:hover { border-color: rgba(var(--accent-rgb), 0.32); background: rgba(var(--accent-rgb), 0.04); }
.btn.primary { background: var(--accent); border-color: transparent; color: #0b1205; }
.btn.primary:hover { background: #b5ff33; }
.btn.danger { border-color: rgba(255, 50, 50, 0.3); color: var(--danger); }
.btn.sm { padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

.empty { color: var(--muted); font-size: 0.88rem; padding: 16px 0; }

@media (max-width: 600px) {
  .sell-page { padding: 20px 12px 60px; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .head-actions { width: 100%; }
  .form-footer { align-items: stretch; }
  .form-actions { width: 100%; }
  .form-actions .btn { flex: 1; justify-content: center; }
}
</style>
