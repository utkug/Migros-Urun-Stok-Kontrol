import puppeteer from "puppeteer"

const BASE_URL = "https://www.migros.com.tr"
const POST_URL = `${BASE_URL}/rest/delivery-bff/preferences/select`

/*
  ÜRÜN URL:

  Stok ve fiyat kontrolü yapmak istediğiniz ürünün
  Migros sitesindeki URL'sindeki ürün kodunu
  aşağıdaki PRODUCT_URL değişkenine yazınız.

  Örnek URL: https://www.migros.com.tr/turk-somonu-butun-kg-p-121c589
  Buradaki "turk-somonu-butun-kg-p-121c589" kısmını değiştirin.
*/
const PRODUCT_URL = "turk-somonu-butun-kg-p-121c589"

const FULL_URL = `${BASE_URL}/${PRODUCT_URL}`

const fetchData = async (page, url) => {
  try {
    return await page.evaluate(async url => { // In the current page, fetches from the given url
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      return res.json()
    }, url)
  } catch (e) {
    console.error(`Error fetching ${url}:`, e.message)
  }
}

const getReId = async (page, url) => {
  let reid = null
  await page.setRequestInterception(true)
  page.on("request", req => {
    if (!reid && req.url().includes("reid")) {
      reid = new URL(req.url()).searchParams.get("reid")
    }
    req.continue()
  })
  await page.goto(url)
  if (!reid) throw new Error("ReId not found.")
  return reid
}

const getCityId = async (page, cityName) => {
  if (Number.isInteger(cityName)) return cityName
  const cities = await fetchData(
    page,
    `${BASE_URL}/rest/delivery-bff/locations/cities/deliverable?serviceAreaObjectType=PICK_POINT`
  )
  const city = cities?.find(c => c.name.toLowerCase() === cityName.toLowerCase())
  if (!city) throw new Error(`City not found: ${cityName}`)
  return city.id
}

const getTownId = async (page, townName, cityId, reid) => {
  const towns = await fetchData(
    page,
    `${BASE_URL}/rest/delivery-bff/locations/towns/${cityId}/deliverable?serviceAreaObjectType=PICK_POINT&reid=${reid}`
  )
  const town = towns.find(t => t.name.toLowerCase() === townName.toLowerCase())
  if (!town) throw new Error(`Town not found: ${townName}`)
  return town.id
}

const getTownStores = async (page, townId) => {
  const res = await fetch(`${BASE_URL}/rest/delivery-bff/locations/pick-points/${townId}/deliverable`)
  const data = await res.json()
  return data.map(({ id, name }) => ({ id, name }))
}

const getStoreList = async (page, cityId, townName, reid) => {
  if (!townName) {
    const towns = await fetchData(page, `${BASE_URL}/rest/delivery-bff/locations/towns/${cityId}/deliverable?serviceAreaObjectType=PICK_POINT`)
    if (!towns) return []
    const stores = await Promise.all(towns.map(({ id }) => getTownStores(page, id)))
    return stores.flat()
  }
  const townId = await getTownId(page, townName, cityId, reid)
  return await getTownStores(page, townId)
}

const changeStore = async (page, store, reid) => {
  const postResponse = await page.evaluate(
    async (url, reid, storeId) => {
      try {
        const response = await fetch(`${url}?reid=${reid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ addressId: null, serviceAreaObjectId: storeId, serviceAreaObjectType: "PICK_POINT" })
        })
        if (response.status === 204) return { success: true }
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      } catch (err) {
        return { success: false, error: err.message }
      }
    },
    POST_URL,
    reid,
    store.id
  )

  if (postResponse.success) {
    await page.goto(FULL_URL, { waitUntil: "networkidle0" })
  } else {
    console.error(`Error (Store ${store.name}, ID ${store.id}):`, postResponse.error)
  }
}

const checkStock = async (page, stores, reid) => {
  page.on("response", async response => {
    const url = response.url()
    try {
      if (url.includes("current")) {
        const json = await response.json()
        console.log(`Current Response: ${json.fullServiceAreaObjectName} Adres: ${json.selectedDeliveryAddressInfo.fullAddress}`)
      } else if (url.includes(`${BASE_URL}/rest/products/screens/`)) {
        const json = await response.json()
        const { status, saleable, shownPrice } = json?.data?.storeProductInfoDTO || {}
        const price = (shownPrice / 100).toFixed(2)
        if (status === "IN_SALE") console.log(`Ürün stokta var: ${status} SALEABLE: ${saleable} Ürün Fiyatı: ${price}`)
        else if (["STOCK_OUT", "DELIST"].includes(status)) console.log(`Ürün stokta yok: ${status}`)
        else console.log(`Ürün durumu bilinmiyor: ${status}`)
      }
    } catch (err) {
      console.error("Response Error:", err.message)
    }
  })
  for (const store of stores) await changeStore(page, store, reid)
}

const checkProductsInStores = async (cityName, townName) => {
  const browser = await puppeteer.launch({ headless: true, args: ["--disable-web-security"] })
  const page = await browser.newPage()
  const reid = await getReId(page, BASE_URL)
  const cityId = await getCityId(page, cityName)
  const stores = await getStoreList(page, cityId, townName, reid)

  console.log(stores)

  await checkStock(page, stores, reid)
  await browser.close()
}


// Kullanım
// await checkProductsInStores("Şehir İsmi", "İlçe")
// await checkProductsInStores(Şehir Plaka Kodu, "İlçe")
// await checkProductsInStores("Şehir İsmi")
// await checkProductsInStores(Şehir Plaka Kodu)
await checkProductsInStores("Ankara","Çankaya")
