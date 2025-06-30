# Migros Ürun Stok Kontrolü
Bu proje, Puppeteer kullanarak Migros web sitesindeki belirli bir ürünün farklı mağazalardaki stok durumunu ve fiyat bilgilerini otomatik olarak kontrol eden bir Node.js uygulamasıdır.

### Projeyi çalıştırmak için:
```bash
# Kurulum
npm install

# Kullanım
await checkStockForStores("Şehir İsmi", "İlçe")
await checkStockForStores(Şehir Plaka Kodu, "İlçe")
await checkStockForStores("Şehir İsmi")
await checkStockForStores(Şehir Plaka Kodu)

# Örnek
await checkProductsInStores("Ankara","Çankaya")
await checkProductsInStores(6,"Çankaya")
await checkProductsInStores("Ankara")
await checkProductsInStores(6)
```
### Ürün URL'si

`PRODUCT_URL` değişkenine, Migros sitesindeki ürünün URL'sinden sadece ürün kodunu yazın.

Örnek: `turk-somonu-butun-kg-p-121c589`  
(URL: `https://www.migros.com.tr/turk-somonu-butun-kg-p-121c589`)

Bu değer, kodun hangi ürün üzerinde çalışacağını belirler.
