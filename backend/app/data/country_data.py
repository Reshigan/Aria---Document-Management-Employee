"""
Comprehensive Multi-Country Data
Tax rules, statutory requirements, and document formats for 50+ countries
"""

from datetime import date

# Country configurations with tax systems, currencies, and formatting
COUNTRY_CONFIGS = [
    # AFRICA
    {
        "country_code": "ZA",
        "country_name": "South Africa",
        "currency_code": "ZAR",
        "currency_symbol": "R",
        "currency_name": "South African Rand",
        "region": "Africa",
        "economic_bloc": "SADC",
        "tax_system": "VAT",
        "fiscal_year_start": "03-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "en",
        "timezone": "Africa/Johannesburg"
    },
    {
        "country_code": "NG",
        "country_name": "Nigeria",
        "currency_code": "NGN",
        "currency_symbol": "₦",
        "currency_name": "Nigerian Naira",
        "region": "Africa",
        "economic_bloc": "ECOWAS",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Africa/Lagos"
    },
    {
        "country_code": "KE",
        "country_name": "Kenya",
        "currency_code": "KES",
        "currency_symbol": "KSh",
        "currency_name": "Kenyan Shilling",
        "region": "Africa",
        "economic_bloc": "EAC",
        "tax_system": "VAT",
        "fiscal_year_start": "07-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Africa/Nairobi"
    },
    {
        "country_code": "EG",
        "country_name": "Egypt",
        "currency_code": "EGP",
        "currency_symbol": "E£",
        "currency_name": "Egyptian Pound",
        "region": "Africa",
        "economic_bloc": "COMESA",
        "tax_system": "VAT",
        "fiscal_year_start": "07-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ar",
        "timezone": "Africa/Cairo"
    },
    {
        "country_code": "MA",
        "country_name": "Morocco",
        "currency_code": "MAD",
        "currency_symbol": "MAD",
        "currency_name": "Moroccan Dirham",
        "region": "Africa",
        "economic_bloc": "AMU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "fr",
        "timezone": "Africa/Casablanca"
    },
    {
        "country_code": "GH",
        "country_name": "Ghana",
        "currency_code": "GHS",
        "currency_symbol": "GH₵",
        "currency_name": "Ghanaian Cedi",
        "region": "Africa",
        "economic_bloc": "ECOWAS",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Africa/Accra"
    },
    
    # EUROPE - EU MEMBERS
    {
        "country_code": "DE",
        "country_name": "Germany",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "MWST",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "de",
        "timezone": "Europe/Berlin"
    },
    {
        "country_code": "FR",
        "country_name": "France",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "TVA",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "fr",
        "timezone": "Europe/Paris"
    },
    {
        "country_code": "IT",
        "country_name": "Italy",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "it",
        "timezone": "Europe/Rome"
    },
    {
        "country_code": "ES",
        "country_name": "Spain",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "IVA",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "es",
        "timezone": "Europe/Madrid"
    },
    {
        "country_code": "NL",
        "country_name": "Netherlands",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "BTW",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "nl",
        "timezone": "Europe/Amsterdam"
    },
    {
        "country_code": "BE",
        "country_name": "Belgium",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "TVA",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "nl",
        "timezone": "Europe/Brussels"
    },
    {
        "country_code": "PT",
        "country_name": "Portugal",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "pt",
        "timezone": "Europe/Lisbon"
    },
    {
        "country_code": "IE",
        "country_name": "Ireland",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Europe/Dublin"
    },
    {
        "country_code": "AT",
        "country_name": "Austria",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "MWST",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "de",
        "timezone": "Europe/Vienna"
    },
    {
        "country_code": "PL",
        "country_name": "Poland",
        "currency_code": "PLN",
        "currency_symbol": "zł",
        "currency_name": "Polish Zloty",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "pl",
        "timezone": "Europe/Warsaw"
    },
    {
        "country_code": "CZ",
        "country_name": "Czech Republic",
        "currency_code": "CZK",
        "currency_symbol": "Kč",
        "currency_name": "Czech Koruna",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "cs",
        "timezone": "Europe/Prague"
    },
    {
        "country_code": "HU",
        "country_name": "Hungary",
        "currency_code": "HUF",
        "currency_symbol": "Ft",
        "currency_name": "Hungarian Forint",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "YYYY-MM-DD",
        "number_format": "1 234,56",
        "language_code": "hu",
        "timezone": "Europe/Budapest"
    },
    {
        "country_code": "RO",
        "country_name": "Romania",
        "currency_code": "RON",
        "currency_symbol": "lei",
        "currency_name": "Romanian Leu",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "ro",
        "timezone": "Europe/Bucharest"
    },
    {
        "country_code": "GR",
        "country_name": "Greece",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "el",
        "timezone": "Europe/Athens"
    },
    
    # EUROPE - NON-EU
    {
        "country_code": "GB",
        "country_name": "United Kingdom",
        "currency_code": "GBP",
        "currency_symbol": "£",
        "currency_name": "British Pound",
        "region": "Europe",
        "economic_bloc": "None",
        "tax_system": "VAT",
        "fiscal_year_start": "04-06",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Europe/London"
    },
    {
        "country_code": "CH",
        "country_name": "Switzerland",
        "currency_code": "CHF",
        "currency_symbol": "CHF",
        "currency_name": "Swiss Franc",
        "region": "Europe",
        "economic_bloc": "EFTA",
        "tax_system": "MWST",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1'234.56",
        "language_code": "de",
        "timezone": "Europe/Zurich"
    },
    {
        "country_code": "NO",
        "country_name": "Norway",
        "currency_code": "NOK",
        "currency_symbol": "kr",
        "currency_name": "Norwegian Krone",
        "region": "Europe",
        "economic_bloc": "EFTA",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "no",
        "timezone": "Europe/Oslo"
    },
    {
        "country_code": "SE",
        "country_name": "Sweden",
        "currency_code": "SEK",
        "currency_symbol": "kr",
        "currency_name": "Swedish Krona",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "YYYY-MM-DD",
        "number_format": "1 234,56",
        "language_code": "sv",
        "timezone": "Europe/Stockholm"
    },
    {
        "country_code": "DK",
        "country_name": "Denmark",
        "currency_code": "DKK",
        "currency_symbol": "kr",
        "currency_name": "Danish Krone",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "da",
        "timezone": "Europe/Copenhagen"
    },
    {
        "country_code": "FI",
        "country_name": "Finland",
        "currency_code": "EUR",
        "currency_symbol": "€",
        "currency_name": "Euro",
        "region": "Europe",
        "economic_bloc": "EU",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1 234,56",
        "language_code": "fi",
        "timezone": "Europe/Helsinki"
    },
    
    # AMERICAS
    {
        "country_code": "US",
        "country_name": "United States",
        "currency_code": "USD",
        "currency_symbol": "$",
        "currency_name": "US Dollar",
        "region": "Americas",
        "economic_bloc": "USMCA",
        "tax_system": "SALES_TAX",
        "fiscal_year_start": "01-01",
        "date_format": "MM/DD/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "America/New_York"
    },
    {
        "country_code": "CA",
        "country_name": "Canada",
        "currency_code": "CAD",
        "currency_symbol": "C$",
        "currency_name": "Canadian Dollar",
        "region": "Americas",
        "economic_bloc": "USMCA",
        "tax_system": "GST",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "America/Toronto"
    },
    {
        "country_code": "MX",
        "country_name": "Mexico",
        "currency_code": "MXN",
        "currency_symbol": "$",
        "currency_name": "Mexican Peso",
        "region": "Americas",
        "economic_bloc": "USMCA",
        "tax_system": "IVA",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "es",
        "timezone": "America/Mexico_City"
    },
    {
        "country_code": "BR",
        "country_name": "Brazil",
        "currency_code": "BRL",
        "currency_symbol": "R$",
        "currency_name": "Brazilian Real",
        "region": "Americas",
        "economic_bloc": "MERCOSUR",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "pt",
        "timezone": "America/Sao_Paulo"
    },
    {
        "country_code": "AR",
        "country_name": "Argentina",
        "currency_code": "ARS",
        "currency_symbol": "$",
        "currency_name": "Argentine Peso",
        "region": "Americas",
        "economic_bloc": "MERCOSUR",
        "tax_system": "IVA",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "es",
        "timezone": "America/Buenos_Aires"
    },
    {
        "country_code": "CL",
        "country_name": "Chile",
        "currency_code": "CLP",
        "currency_symbol": "$",
        "currency_name": "Chilean Peso",
        "region": "Americas",
        "economic_bloc": "Pacific Alliance",
        "tax_system": "IVA",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "es",
        "timezone": "America/Santiago"
    },
    {
        "country_code": "CO",
        "country_name": "Colombia",
        "currency_code": "COP",
        "currency_symbol": "$",
        "currency_name": "Colombian Peso",
        "region": "Americas",
        "economic_bloc": "Pacific Alliance",
        "tax_system": "IVA",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "es",
        "timezone": "America/Bogota"
    },
    {
        "country_code": "PE",
        "country_name": "Peru",
        "currency_code": "PEN",
        "currency_symbol": "S/",
        "currency_name": "Peruvian Sol",
        "region": "Americas",
        "economic_bloc": "Pacific Alliance",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "es",
        "timezone": "America/Lima"
    },
    
    # ASIA-PACIFIC
    {
        "country_code": "AU",
        "country_name": "Australia",
        "currency_code": "AUD",
        "currency_symbol": "A$",
        "currency_name": "Australian Dollar",
        "region": "Asia-Pacific",
        "economic_bloc": "APEC",
        "tax_system": "GST",
        "fiscal_year_start": "07-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Australia/Sydney"
    },
    {
        "country_code": "NZ",
        "country_name": "New Zealand",
        "currency_code": "NZD",
        "currency_symbol": "NZ$",
        "currency_name": "New Zealand Dollar",
        "region": "Asia-Pacific",
        "economic_bloc": "APEC",
        "tax_system": "GST",
        "fiscal_year_start": "04-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Pacific/Auckland"
    },
    {
        "country_code": "JP",
        "country_name": "Japan",
        "currency_code": "JPY",
        "currency_symbol": "¥",
        "currency_name": "Japanese Yen",
        "region": "Asia-Pacific",
        "economic_bloc": "APEC",
        "tax_system": "CONSUMPTION_TAX",
        "fiscal_year_start": "04-01",
        "date_format": "YYYY-MM-DD",
        "number_format": "1,234",
        "language_code": "ja",
        "timezone": "Asia/Tokyo"
    },
    {
        "country_code": "CN",
        "country_name": "China",
        "currency_code": "CNY",
        "currency_symbol": "¥",
        "currency_name": "Chinese Yuan",
        "region": "Asia-Pacific",
        "economic_bloc": "APEC",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "YYYY-MM-DD",
        "number_format": "1,234.56",
        "language_code": "zh",
        "timezone": "Asia/Shanghai"
    },
    {
        "country_code": "HK",
        "country_name": "Hong Kong",
        "currency_code": "HKD",
        "currency_symbol": "HK$",
        "currency_name": "Hong Kong Dollar",
        "region": "Asia-Pacific",
        "economic_bloc": "APEC",
        "tax_system": "NONE",
        "fiscal_year_start": "04-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Asia/Hong_Kong"
    },
    {
        "country_code": "SG",
        "country_name": "Singapore",
        "currency_code": "SGD",
        "currency_symbol": "S$",
        "currency_name": "Singapore Dollar",
        "region": "Asia-Pacific",
        "economic_bloc": "ASEAN",
        "tax_system": "GST",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Asia/Singapore"
    },
    {
        "country_code": "IN",
        "country_name": "India",
        "currency_code": "INR",
        "currency_symbol": "₹",
        "currency_name": "Indian Rupee",
        "region": "Asia-Pacific",
        "economic_bloc": "SAARC",
        "tax_system": "GST",
        "fiscal_year_start": "04-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,23,456.78",
        "language_code": "en",
        "timezone": "Asia/Kolkata"
    },
    {
        "country_code": "KR",
        "country_name": "South Korea",
        "currency_code": "KRW",
        "currency_symbol": "₩",
        "currency_name": "South Korean Won",
        "region": "Asia-Pacific",
        "economic_bloc": "APEC",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "YYYY-MM-DD",
        "number_format": "1,234",
        "language_code": "ko",
        "timezone": "Asia/Seoul"
    },
    {
        "country_code": "TW",
        "country_name": "Taiwan",
        "currency_code": "TWD",
        "currency_symbol": "NT$",
        "currency_name": "New Taiwan Dollar",
        "region": "Asia-Pacific",
        "economic_bloc": "APEC",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "YYYY-MM-DD",
        "number_format": "1,234.56",
        "language_code": "zh",
        "timezone": "Asia/Taipei"
    },
    {
        "country_code": "MY",
        "country_name": "Malaysia",
        "currency_code": "MYR",
        "currency_symbol": "RM",
        "currency_name": "Malaysian Ringgit",
        "region": "Asia-Pacific",
        "economic_bloc": "ASEAN",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ms",
        "timezone": "Asia/Kuala_Lumpur"
    },
    {
        "country_code": "TH",
        "country_name": "Thailand",
        "currency_code": "THB",
        "currency_symbol": "฿",
        "currency_name": "Thai Baht",
        "region": "Asia-Pacific",
        "economic_bloc": "ASEAN",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "th",
        "timezone": "Asia/Bangkok"
    },
    {
        "country_code": "ID",
        "country_name": "Indonesia",
        "currency_code": "IDR",
        "currency_symbol": "Rp",
        "currency_name": "Indonesian Rupiah",
        "region": "Asia-Pacific",
        "economic_bloc": "ASEAN",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "id",
        "timezone": "Asia/Jakarta"
    },
    {
        "country_code": "PH",
        "country_name": "Philippines",
        "currency_code": "PHP",
        "currency_symbol": "₱",
        "currency_name": "Philippine Peso",
        "region": "Asia-Pacific",
        "economic_bloc": "ASEAN",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "MM/DD/YYYY",
        "number_format": "1,234.56",
        "language_code": "en",
        "timezone": "Asia/Manila"
    },
    {
        "country_code": "VN",
        "country_name": "Vietnam",
        "currency_code": "VND",
        "currency_symbol": "₫",
        "currency_name": "Vietnamese Dong",
        "region": "Asia-Pacific",
        "economic_bloc": "ASEAN",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "vi",
        "timezone": "Asia/Ho_Chi_Minh"
    },
    
    # MIDDLE EAST
    {
        "country_code": "AE",
        "country_name": "United Arab Emirates",
        "currency_code": "AED",
        "currency_symbol": "د.إ",
        "currency_name": "UAE Dirham",
        "region": "Middle East",
        "economic_bloc": "GCC",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ar",
        "timezone": "Asia/Dubai"
    },
    {
        "country_code": "SA",
        "country_name": "Saudi Arabia",
        "currency_code": "SAR",
        "currency_symbol": "﷼",
        "currency_name": "Saudi Riyal",
        "region": "Middle East",
        "economic_bloc": "GCC",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ar",
        "timezone": "Asia/Riyadh"
    },
    {
        "country_code": "IL",
        "country_name": "Israel",
        "currency_code": "ILS",
        "currency_symbol": "₪",
        "currency_name": "Israeli Shekel",
        "region": "Middle East",
        "economic_bloc": "None",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "he",
        "timezone": "Asia/Jerusalem"
    },
    {
        "country_code": "TR",
        "country_name": "Turkey",
        "currency_code": "TRY",
        "currency_symbol": "₺",
        "currency_name": "Turkish Lira",
        "region": "Middle East",
        "economic_bloc": "None",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1.234,56",
        "language_code": "tr",
        "timezone": "Europe/Istanbul"
    },
    {
        "country_code": "QA",
        "country_name": "Qatar",
        "currency_code": "QAR",
        "currency_symbol": "﷼",
        "currency_name": "Qatari Riyal",
        "region": "Middle East",
        "economic_bloc": "GCC",
        "tax_system": "NONE",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ar",
        "timezone": "Asia/Qatar"
    },
    {
        "country_code": "KW",
        "country_name": "Kuwait",
        "currency_code": "KWD",
        "currency_symbol": "د.ك",
        "currency_name": "Kuwaiti Dinar",
        "region": "Middle East",
        "economic_bloc": "GCC",
        "tax_system": "NONE",
        "fiscal_year_start": "04-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ar",
        "timezone": "Asia/Kuwait"
    },
    {
        "country_code": "BH",
        "country_name": "Bahrain",
        "currency_code": "BHD",
        "currency_symbol": "BD",
        "currency_name": "Bahraini Dinar",
        "region": "Middle East",
        "economic_bloc": "GCC",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ar",
        "timezone": "Asia/Bahrain"
    },
    {
        "country_code": "OM",
        "country_name": "Oman",
        "currency_code": "OMR",
        "currency_symbol": "﷼",
        "currency_name": "Omani Rial",
        "region": "Middle East",
        "economic_bloc": "GCC",
        "tax_system": "VAT",
        "fiscal_year_start": "01-01",
        "date_format": "DD/MM/YYYY",
        "number_format": "1,234.56",
        "language_code": "ar",
        "timezone": "Asia/Muscat"
    },
]


# Tax rules for each country
TAX_RULES = [
    # SOUTH AFRICA
    {
        "country_code": "ZA",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_name_local": "BTW Standaard",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 15.0,
        "registration_threshold": 1000000,
        "registration_threshold_currency": "ZAR",
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 25,
        "payment_deadline_days": 25,
        "effective_from": date(2018, 4, 1),
        "tax_authority_name": "South African Revenue Service (SARS)",
        "tax_authority_code": "SARS",
        "tax_authority_website": "https://www.sars.gov.za",
        "output_tax_account": "2200",
        "input_tax_account": "1400"
    },
    {
        "country_code": "ZA",
        "tax_code": "VAT_ZERO",
        "tax_name": "Zero-Rated VAT",
        "tax_type": "VAT",
        "tax_category": "ZERO",
        "rate": 0.0,
        "effective_from": date(2018, 4, 1),
        "tax_authority_name": "South African Revenue Service (SARS)",
        "tax_authority_code": "SARS"
    },
    {
        "country_code": "ZA",
        "tax_code": "VAT_EXEMPT",
        "tax_name": "VAT Exempt",
        "tax_type": "VAT",
        "tax_category": "EXEMPT",
        "rate": 0.0,
        "effective_from": date(2018, 4, 1),
        "tax_authority_name": "South African Revenue Service (SARS)",
        "tax_authority_code": "SARS"
    },
    {
        "country_code": "ZA",
        "tax_code": "PAYE",
        "tax_name": "Pay As You Earn",
        "tax_type": "PAYROLL",
        "tax_category": "INCOME_TAX",
        "rate": 0.0,  # Progressive rates
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 7,
        "effective_from": date(2020, 3, 1),
        "tax_authority_name": "South African Revenue Service (SARS)",
        "tax_authority_code": "SARS"
    },
    {
        "country_code": "ZA",
        "tax_code": "UIF",
        "tax_name": "Unemployment Insurance Fund",
        "tax_type": "PAYROLL",
        "tax_category": "SOCIAL_SECURITY",
        "rate": 2.0,  # 1% employee + 1% employer
        "filing_frequency": "MONTHLY",
        "effective_from": date(2020, 3, 1),
        "tax_authority_name": "Department of Labour"
    },
    {
        "country_code": "ZA",
        "tax_code": "SDL",
        "tax_name": "Skills Development Levy",
        "tax_type": "PAYROLL",
        "tax_category": "LEVY",
        "rate": 1.0,
        "registration_threshold": 500000,
        "registration_threshold_currency": "ZAR",
        "filing_frequency": "MONTHLY",
        "effective_from": date(2020, 3, 1),
        "tax_authority_name": "South African Revenue Service (SARS)"
    },
    
    # UNITED KINGDOM
    {
        "country_code": "GB",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 20.0,
        "rate_reduced": 5.0,
        "registration_threshold": 85000,
        "registration_threshold_currency": "GBP",
        "filing_frequency": "QUARTERLY",
        "filing_deadline_days": 37,
        "payment_deadline_days": 37,
        "effective_from": date(2011, 1, 4),
        "tax_authority_name": "HM Revenue & Customs (HMRC)",
        "tax_authority_code": "HMRC",
        "tax_authority_website": "https://www.gov.uk/government/organisations/hm-revenue-customs"
    },
    {
        "country_code": "GB",
        "tax_code": "VAT_REDUCED",
        "tax_name": "Reduced VAT",
        "tax_type": "VAT",
        "tax_category": "REDUCED",
        "rate": 5.0,
        "effective_from": date(2011, 1, 4),
        "tax_authority_name": "HM Revenue & Customs (HMRC)"
    },
    {
        "country_code": "GB",
        "tax_code": "VAT_ZERO",
        "tax_name": "Zero-Rated VAT",
        "tax_type": "VAT",
        "tax_category": "ZERO",
        "rate": 0.0,
        "effective_from": date(2011, 1, 4),
        "tax_authority_name": "HM Revenue & Customs (HMRC)"
    },
    
    # GERMANY
    {
        "country_code": "DE",
        "tax_code": "MWST_STD",
        "tax_name": "Standard MwSt",
        "tax_name_local": "Mehrwertsteuer",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 19.0,
        "rate_reduced": 7.0,
        "registration_threshold": 22000,
        "registration_threshold_currency": "EUR",
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 10,
        "payment_deadline_days": 10,
        "reverse_charge_applicable": True,
        "effective_from": date(2021, 1, 1),
        "tax_authority_name": "Bundeszentralamt für Steuern",
        "tax_authority_code": "BZSt",
        "tax_authority_website": "https://www.bzst.de"
    },
    {
        "country_code": "DE",
        "tax_code": "MWST_REDUCED",
        "tax_name": "Reduced MwSt",
        "tax_type": "VAT",
        "tax_category": "REDUCED",
        "rate": 7.0,
        "effective_from": date(2021, 1, 1),
        "tax_authority_name": "Bundeszentralamt für Steuern"
    },
    
    # FRANCE
    {
        "country_code": "FR",
        "tax_code": "TVA_STD",
        "tax_name": "Standard TVA",
        "tax_name_local": "Taxe sur la Valeur Ajoutée",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 20.0,
        "rate_reduced": 10.0,
        "rate_super_reduced": 5.5,
        "registration_threshold": 85800,
        "registration_threshold_currency": "EUR",
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 24,
        "reverse_charge_applicable": True,
        "effective_from": date(2014, 1, 1),
        "tax_authority_name": "Direction Générale des Finances Publiques",
        "tax_authority_code": "DGFiP",
        "tax_authority_website": "https://www.impots.gouv.fr"
    },
    {
        "country_code": "FR",
        "tax_code": "TVA_REDUCED",
        "tax_name": "Reduced TVA",
        "tax_type": "VAT",
        "tax_category": "REDUCED",
        "rate": 10.0,
        "effective_from": date(2014, 1, 1),
        "tax_authority_name": "Direction Générale des Finances Publiques"
    },
    {
        "country_code": "FR",
        "tax_code": "TVA_SUPER_REDUCED",
        "tax_name": "Super Reduced TVA",
        "tax_type": "VAT",
        "tax_category": "SUPER_REDUCED",
        "rate": 5.5,
        "effective_from": date(2014, 1, 1),
        "tax_authority_name": "Direction Générale des Finances Publiques"
    },
    
    # NETHERLANDS
    {
        "country_code": "NL",
        "tax_code": "BTW_STD",
        "tax_name": "Standard BTW",
        "tax_name_local": "Belasting over de Toegevoegde Waarde",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 21.0,
        "rate_reduced": 9.0,
        "registration_threshold": 0,  # No threshold
        "filing_frequency": "QUARTERLY",
        "filing_deadline_days": 30,
        "reverse_charge_applicable": True,
        "effective_from": date(2019, 1, 1),
        "tax_authority_name": "Belastingdienst",
        "tax_authority_website": "https://www.belastingdienst.nl"
    },
    
    # SPAIN
    {
        "country_code": "ES",
        "tax_code": "IVA_STD",
        "tax_name": "Standard IVA",
        "tax_name_local": "Impuesto sobre el Valor Añadido",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 21.0,
        "rate_reduced": 10.0,
        "rate_super_reduced": 4.0,
        "filing_frequency": "QUARTERLY",
        "filing_deadline_days": 20,
        "reverse_charge_applicable": True,
        "effective_from": date(2012, 9, 1),
        "tax_authority_name": "Agencia Tributaria",
        "tax_authority_website": "https://www.agenciatributaria.es"
    },
    
    # ITALY
    {
        "country_code": "IT",
        "tax_code": "IVA_STD",
        "tax_name": "Standard IVA",
        "tax_name_local": "Imposta sul Valore Aggiunto",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 22.0,
        "rate_reduced": 10.0,
        "rate_super_reduced": 4.0,
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 16,
        "reverse_charge_applicable": True,
        "effective_from": date(2013, 10, 1),
        "tax_authority_name": "Agenzia delle Entrate",
        "tax_authority_website": "https://www.agenziaentrate.gov.it"
    },
    
    # UNITED STATES (Federal + Example States)
    {
        "country_code": "US",
        "tax_code": "SALES_CA",
        "tax_name": "California Sales Tax",
        "tax_type": "SALES_TAX",
        "tax_category": "STATE",
        "rate": 7.25,  # State rate, local can add more
        "filing_frequency": "QUARTERLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "California Department of Tax and Fee Administration",
        "tax_authority_code": "CDTFA",
        "tax_authority_website": "https://www.cdtfa.ca.gov"
    },
    {
        "country_code": "US",
        "tax_code": "SALES_NY",
        "tax_name": "New York Sales Tax",
        "tax_type": "SALES_TAX",
        "tax_category": "STATE",
        "rate": 4.0,  # State rate
        "filing_frequency": "QUARTERLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "New York State Department of Taxation and Finance",
        "tax_authority_website": "https://www.tax.ny.gov"
    },
    {
        "country_code": "US",
        "tax_code": "SALES_TX",
        "tax_name": "Texas Sales Tax",
        "tax_type": "SALES_TAX",
        "tax_category": "STATE",
        "rate": 6.25,
        "filing_frequency": "QUARTERLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "Texas Comptroller of Public Accounts",
        "tax_authority_website": "https://comptroller.texas.gov"
    },
    {
        "country_code": "US",
        "tax_code": "SALES_FL",
        "tax_name": "Florida Sales Tax",
        "tax_type": "SALES_TAX",
        "tax_category": "STATE",
        "rate": 6.0,
        "filing_frequency": "MONTHLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "Florida Department of Revenue",
        "tax_authority_website": "https://floridarevenue.com"
    },
    {
        "country_code": "US",
        "tax_code": "FICA",
        "tax_name": "FICA (Social Security + Medicare)",
        "tax_type": "PAYROLL",
        "tax_category": "SOCIAL_SECURITY",
        "rate": 15.3,  # 7.65% employee + 7.65% employer
        "filing_frequency": "QUARTERLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "Internal Revenue Service (IRS)",
        "tax_authority_website": "https://www.irs.gov"
    },
    
    # CANADA
    {
        "country_code": "CA",
        "tax_code": "GST",
        "tax_name": "Goods and Services Tax",
        "tax_type": "GST",
        "tax_category": "FEDERAL",
        "rate": 5.0,
        "registration_threshold": 30000,
        "registration_threshold_currency": "CAD",
        "filing_frequency": "QUARTERLY",
        "filing_deadline_days": 30,
        "effective_from": date(2008, 1, 1),
        "tax_authority_name": "Canada Revenue Agency (CRA)",
        "tax_authority_code": "CRA",
        "tax_authority_website": "https://www.canada.ca/en/revenue-agency.html"
    },
    {
        "country_code": "CA",
        "tax_code": "HST_ON",
        "tax_name": "Ontario HST",
        "tax_type": "GST",
        "tax_category": "HARMONIZED",
        "rate": 13.0,  # 5% GST + 8% PST
        "filing_frequency": "QUARTERLY",
        "effective_from": date(2010, 7, 1),
        "tax_authority_name": "Canada Revenue Agency (CRA)"
    },
    {
        "country_code": "CA",
        "tax_code": "QST",
        "tax_name": "Quebec Sales Tax",
        "tax_type": "GST",
        "tax_category": "PROVINCIAL",
        "rate": 9.975,
        "filing_frequency": "QUARTERLY",
        "effective_from": date(2013, 1, 1),
        "tax_authority_name": "Revenu Québec"
    },
    
    # AUSTRALIA
    {
        "country_code": "AU",
        "tax_code": "GST",
        "tax_name": "Goods and Services Tax",
        "tax_type": "GST",
        "tax_category": "STANDARD",
        "rate": 10.0,
        "registration_threshold": 75000,
        "registration_threshold_currency": "AUD",
        "filing_frequency": "QUARTERLY",
        "filing_deadline_days": 28,
        "effective_from": date(2000, 7, 1),
        "tax_authority_name": "Australian Taxation Office (ATO)",
        "tax_authority_code": "ATO",
        "tax_authority_website": "https://www.ato.gov.au"
    },
    {
        "country_code": "AU",
        "tax_code": "GST_FREE",
        "tax_name": "GST-Free",
        "tax_type": "GST",
        "tax_category": "ZERO",
        "rate": 0.0,
        "effective_from": date(2000, 7, 1),
        "tax_authority_name": "Australian Taxation Office (ATO)"
    },
    
    # NEW ZEALAND
    {
        "country_code": "NZ",
        "tax_code": "GST",
        "tax_name": "Goods and Services Tax",
        "tax_type": "GST",
        "tax_category": "STANDARD",
        "rate": 15.0,
        "registration_threshold": 60000,
        "registration_threshold_currency": "NZD",
        "filing_frequency": "BI_MONTHLY",
        "filing_deadline_days": 28,
        "effective_from": date(2010, 10, 1),
        "tax_authority_name": "Inland Revenue (IRD)",
        "tax_authority_code": "IRD",
        "tax_authority_website": "https://www.ird.govt.nz"
    },
    
    # SINGAPORE
    {
        "country_code": "SG",
        "tax_code": "GST",
        "tax_name": "Goods and Services Tax",
        "tax_type": "GST",
        "tax_category": "STANDARD",
        "rate": 9.0,  # Increased from 8% in 2024
        "registration_threshold": 1000000,
        "registration_threshold_currency": "SGD",
        "filing_frequency": "QUARTERLY",
        "filing_deadline_days": 30,
        "effective_from": date(2024, 1, 1),
        "tax_authority_name": "Inland Revenue Authority of Singapore (IRAS)",
        "tax_authority_code": "IRAS",
        "tax_authority_website": "https://www.iras.gov.sg"
    },
    
    # INDIA
    {
        "country_code": "IN",
        "tax_code": "CGST",
        "tax_name": "Central GST",
        "tax_type": "GST",
        "tax_category": "CENTRAL",
        "rate": 9.0,  # Half of 18% standard rate
        "registration_threshold": 4000000,
        "registration_threshold_currency": "INR",
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 20,
        "effective_from": date(2017, 7, 1),
        "tax_authority_name": "Central Board of Indirect Taxes and Customs",
        "tax_authority_code": "CBIC",
        "tax_authority_website": "https://www.cbic.gov.in"
    },
    {
        "country_code": "IN",
        "tax_code": "SGST",
        "tax_name": "State GST",
        "tax_type": "GST",
        "tax_category": "STATE",
        "rate": 9.0,  # Half of 18% standard rate
        "filing_frequency": "MONTHLY",
        "effective_from": date(2017, 7, 1),
        "tax_authority_name": "State Tax Authorities"
    },
    {
        "country_code": "IN",
        "tax_code": "IGST",
        "tax_name": "Integrated GST",
        "tax_type": "GST",
        "tax_category": "INTEGRATED",
        "rate": 18.0,  # For inter-state supplies
        "filing_frequency": "MONTHLY",
        "effective_from": date(2017, 7, 1),
        "tax_authority_name": "Central Board of Indirect Taxes and Customs"
    },
    
    # JAPAN
    {
        "country_code": "JP",
        "tax_code": "CT",
        "tax_name": "Consumption Tax",
        "tax_name_local": "消費税",
        "tax_type": "CONSUMPTION_TAX",
        "tax_category": "STANDARD",
        "rate": 10.0,
        "rate_reduced": 8.0,  # For food and newspapers
        "registration_threshold": 10000000,
        "registration_threshold_currency": "JPY",
        "filing_frequency": "ANNUAL",
        "effective_from": date(2019, 10, 1),
        "tax_authority_name": "National Tax Agency",
        "tax_authority_code": "NTA",
        "tax_authority_website": "https://www.nta.go.jp"
    },
    
    # UAE
    {
        "country_code": "AE",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 5.0,
        "registration_threshold": 375000,
        "registration_threshold_currency": "AED",
        "filing_frequency": "QUARTERLY",
        "filing_deadline_days": 28,
        "effective_from": date(2018, 1, 1),
        "tax_authority_name": "Federal Tax Authority (FTA)",
        "tax_authority_code": "FTA",
        "tax_authority_website": "https://www.tax.gov.ae"
    },
    
    # SAUDI ARABIA
    {
        "country_code": "SA",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 15.0,
        "registration_threshold": 375000,
        "registration_threshold_currency": "SAR",
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 28,
        "effective_from": date(2020, 7, 1),
        "tax_authority_name": "Zakat, Tax and Customs Authority (ZATCA)",
        "tax_authority_code": "ZATCA",
        "tax_authority_website": "https://zatca.gov.sa"
    },
    
    # BRAZIL
    {
        "country_code": "BR",
        "tax_code": "ICMS",
        "tax_name": "ICMS (State VAT)",
        "tax_type": "VAT",
        "tax_category": "STATE",
        "rate": 18.0,  # Varies by state (12-25%)
        "filing_frequency": "MONTHLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "State Tax Authorities"
    },
    {
        "country_code": "BR",
        "tax_code": "PIS",
        "tax_name": "PIS (Social Integration Program)",
        "tax_type": "VAT",
        "tax_category": "FEDERAL",
        "rate": 1.65,
        "filing_frequency": "MONTHLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "Receita Federal"
    },
    {
        "country_code": "BR",
        "tax_code": "COFINS",
        "tax_name": "COFINS (Social Security Financing)",
        "tax_type": "VAT",
        "tax_category": "FEDERAL",
        "rate": 7.6,
        "filing_frequency": "MONTHLY",
        "effective_from": date(2020, 1, 1),
        "tax_authority_name": "Receita Federal"
    },
    
    # MEXICO
    {
        "country_code": "MX",
        "tax_code": "IVA_STD",
        "tax_name": "Standard IVA",
        "tax_name_local": "Impuesto al Valor Agregado",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 16.0,
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 17,
        "effective_from": date(2010, 1, 1),
        "tax_authority_name": "Servicio de Administración Tributaria (SAT)",
        "tax_authority_code": "SAT",
        "tax_authority_website": "https://www.sat.gob.mx"
    },
    
    # CHINA
    {
        "country_code": "CN",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_name_local": "增值税",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 13.0,
        "rate_reduced": 9.0,
        "filing_frequency": "MONTHLY",
        "effective_from": date(2019, 4, 1),
        "tax_authority_name": "State Taxation Administration",
        "tax_authority_website": "http://www.chinatax.gov.cn"
    },
    
    # SWITZERLAND
    {
        "country_code": "CH",
        "tax_code": "MWST_STD",
        "tax_name": "Standard MwSt",
        "tax_name_local": "Mehrwertsteuer",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 8.1,
        "rate_reduced": 2.6,
        "registration_threshold": 100000,
        "registration_threshold_currency": "CHF",
        "filing_frequency": "QUARTERLY",
        "effective_from": date(2024, 1, 1),
        "tax_authority_name": "Federal Tax Administration (FTA)",
        "tax_authority_website": "https://www.estv.admin.ch"
    },
    
    # IRELAND
    {
        "country_code": "IE",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 23.0,
        "rate_reduced": 13.5,
        "rate_super_reduced": 9.0,
        "registration_threshold": 37500,
        "registration_threshold_currency": "EUR",
        "filing_frequency": "BI_MONTHLY",
        "reverse_charge_applicable": True,
        "effective_from": date(2012, 1, 1),
        "tax_authority_name": "Revenue Commissioners",
        "tax_authority_website": "https://www.revenue.ie"
    },
    
    # POLAND
    {
        "country_code": "PL",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_name_local": "Podatek od towarów i usług",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 23.0,
        "rate_reduced": 8.0,
        "rate_super_reduced": 5.0,
        "registration_threshold": 200000,
        "registration_threshold_currency": "PLN",
        "filing_frequency": "MONTHLY",
        "reverse_charge_applicable": True,
        "effective_from": date(2011, 1, 1),
        "tax_authority_name": "Krajowa Administracja Skarbowa",
        "tax_authority_website": "https://www.podatki.gov.pl"
    },
    
    # NIGERIA
    {
        "country_code": "NG",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 7.5,
        "registration_threshold": 25000000,
        "registration_threshold_currency": "NGN",
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 21,
        "effective_from": date(2020, 2, 1),
        "tax_authority_name": "Federal Inland Revenue Service (FIRS)",
        "tax_authority_code": "FIRS",
        "tax_authority_website": "https://www.firs.gov.ng"
    },
    
    # KENYA
    {
        "country_code": "KE",
        "tax_code": "VAT_STD",
        "tax_name": "Standard VAT",
        "tax_type": "VAT",
        "tax_category": "STANDARD",
        "rate": 16.0,
        "registration_threshold": 5000000,
        "registration_threshold_currency": "KES",
        "filing_frequency": "MONTHLY",
        "filing_deadline_days": 20,
        "effective_from": date(2013, 9, 2),
        "tax_authority_name": "Kenya Revenue Authority (KRA)",
        "tax_authority_code": "KRA",
        "tax_authority_website": "https://www.kra.go.ke"
    },
]


# Statutory rules for each country
STATUTORY_RULES = [
    # SOUTH AFRICA
    {
        "country_code": "ZA",
        "rule_code": "BCEA_WORKING_HOURS",
        "rule_name": "Basic Conditions of Employment Act - Working Hours",
        "rule_category": "LABOR",
        "description": "Maximum ordinary working hours and overtime regulations",
        "legal_reference": "Basic Conditions of Employment Act 75 of 1997",
        "requirements": {
            "max_ordinary_hours_week": 45,
            "max_ordinary_hours_day": 9,
            "max_overtime_hours_week": 10,
            "overtime_rate_multiplier": 1.5,
            "sunday_rate_multiplier": 2.0,
            "public_holiday_rate_multiplier": 2.0
        },
        "thresholds": {
            "earnings_threshold_for_overtime": 241110.59  # Annual
        },
        "regulatory_authority": "Department of Employment and Labour",
        "authority_website": "https://www.labour.gov.za",
        "effective_from": date(1997, 12, 1),
        "is_mandatory": True
    },
    {
        "country_code": "ZA",
        "rule_code": "BCEA_LEAVE",
        "rule_name": "Basic Conditions of Employment Act - Leave",
        "rule_category": "LABOR",
        "description": "Annual leave, sick leave, and family responsibility leave",
        "legal_reference": "Basic Conditions of Employment Act 75 of 1997",
        "requirements": {
            "annual_leave_days": 21,
            "sick_leave_days_per_cycle": 30,
            "sick_leave_cycle_months": 36,
            "family_responsibility_leave_days": 3,
            "maternity_leave_months": 4
        },
        "regulatory_authority": "Department of Employment and Labour",
        "effective_from": date(1997, 12, 1),
        "is_mandatory": True
    },
    {
        "country_code": "ZA",
        "rule_code": "BBBEE",
        "rule_name": "Broad-Based Black Economic Empowerment",
        "rule_category": "COMPLIANCE",
        "description": "B-BBEE compliance and scorecard requirements",
        "legal_reference": "Broad-Based Black Economic Empowerment Act 53 of 2003",
        "requirements": {
            "scorecard_elements": ["Ownership", "Management Control", "Skills Development", "Enterprise Development", "Socio-Economic Development"],
            "verification_required": True,
            "verification_frequency_years": 1
        },
        "compliance_frameworks": ["BBBEE"],
        "regulatory_authority": "Department of Trade, Industry and Competition",
        "authority_website": "https://www.thedtic.gov.za",
        "effective_from": date(2003, 1, 9),
        "is_mandatory": True
    },
    {
        "country_code": "ZA",
        "rule_code": "POPIA",
        "rule_name": "Protection of Personal Information Act",
        "rule_category": "DATA_PROTECTION",
        "description": "Data protection and privacy requirements",
        "legal_reference": "Protection of Personal Information Act 4 of 2013",
        "requirements": {
            "data_subject_consent_required": True,
            "data_breach_notification_required": True,
            "data_breach_notification_hours": 72,
            "data_protection_officer_required": True,
            "cross_border_transfer_restrictions": True
        },
        "compliance_frameworks": ["POPIA", "GDPR"],
        "regulatory_authority": "Information Regulator",
        "authority_website": "https://www.justice.gov.za/inforeg",
        "effective_from": date(2021, 7, 1),
        "is_mandatory": True
    },
    {
        "country_code": "ZA",
        "rule_code": "COMPANIES_ACT",
        "rule_name": "Companies Act Annual Returns",
        "rule_category": "CORPORATE",
        "description": "Annual return filing requirements for companies",
        "legal_reference": "Companies Act 71 of 2008",
        "filing_requirements": {
            "annual_return": True,
            "financial_statements": True,
            "audit_required_threshold": 5000000
        },
        "filing_frequency": "ANNUAL",
        "filing_deadline": "Within 30 days of anniversary of incorporation",
        "regulatory_authority": "Companies and Intellectual Property Commission (CIPC)",
        "authority_website": "https://www.cipc.co.za",
        "effective_from": date(2011, 5, 1),
        "is_mandatory": True
    },
    
    # UNITED KINGDOM
    {
        "country_code": "GB",
        "rule_code": "UK_GDPR",
        "rule_name": "UK General Data Protection Regulation",
        "rule_category": "DATA_PROTECTION",
        "description": "Data protection requirements post-Brexit",
        "legal_reference": "UK GDPR and Data Protection Act 2018",
        "requirements": {
            "data_subject_consent_required": True,
            "data_breach_notification_required": True,
            "data_breach_notification_hours": 72,
            "data_protection_officer_required": True,
            "data_protection_impact_assessment_required": True
        },
        "compliance_frameworks": ["UK_GDPR"],
        "regulatory_authority": "Information Commissioner's Office (ICO)",
        "authority_website": "https://ico.org.uk",
        "effective_from": date(2021, 1, 1),
        "is_mandatory": True
    },
    {
        "country_code": "GB",
        "rule_code": "UK_MINIMUM_WAGE",
        "rule_name": "National Minimum Wage",
        "rule_category": "LABOR",
        "description": "Minimum wage requirements by age group",
        "legal_reference": "National Minimum Wage Act 1998",
        "thresholds": {
            "national_living_wage_23_plus": 11.44,
            "minimum_wage_21_22": 11.44,
            "minimum_wage_18_20": 8.60,
            "minimum_wage_under_18": 6.40,
            "apprentice_rate": 6.40
        },
        "regulatory_authority": "HM Revenue & Customs",
        "effective_from": date(2024, 4, 1),
        "is_mandatory": True
    },
    {
        "country_code": "GB",
        "rule_code": "UK_STATUTORY_LEAVE",
        "rule_name": "Statutory Leave Entitlements",
        "rule_category": "LABOR",
        "description": "Statutory annual leave and other leave entitlements",
        "legal_reference": "Working Time Regulations 1998",
        "requirements": {
            "annual_leave_weeks": 5.6,
            "statutory_sick_pay_weeks": 28,
            "maternity_leave_weeks": 52,
            "paternity_leave_weeks": 2,
            "shared_parental_leave_weeks": 50
        },
        "regulatory_authority": "ACAS",
        "effective_from": date(1998, 10, 1),
        "is_mandatory": True
    },
    
    # EUROPEAN UNION (GDPR applies to all EU members)
    {
        "country_code": "DE",
        "rule_code": "EU_GDPR",
        "rule_name": "General Data Protection Regulation",
        "rule_category": "DATA_PROTECTION",
        "description": "EU-wide data protection regulation",
        "legal_reference": "Regulation (EU) 2016/679",
        "requirements": {
            "data_subject_consent_required": True,
            "data_breach_notification_required": True,
            "data_breach_notification_hours": 72,
            "data_protection_officer_required": True,
            "data_protection_impact_assessment_required": True,
            "right_to_be_forgotten": True,
            "data_portability": True
        },
        "penalty_info": {
            "max_penalty_percentage_turnover": 4,
            "max_penalty_fixed": 20000000
        },
        "compliance_frameworks": ["GDPR"],
        "regulatory_authority": "Bundesbeauftragter für den Datenschutz",
        "effective_from": date(2018, 5, 25),
        "is_mandatory": True
    },
    {
        "country_code": "FR",
        "rule_code": "EU_GDPR",
        "rule_name": "General Data Protection Regulation",
        "rule_category": "DATA_PROTECTION",
        "description": "EU-wide data protection regulation",
        "legal_reference": "Regulation (EU) 2016/679",
        "requirements": {
            "data_subject_consent_required": True,
            "data_breach_notification_required": True,
            "data_breach_notification_hours": 72,
            "data_protection_officer_required": True
        },
        "compliance_frameworks": ["GDPR"],
        "regulatory_authority": "Commission Nationale de l'Informatique et des Libertés (CNIL)",
        "authority_website": "https://www.cnil.fr",
        "effective_from": date(2018, 5, 25),
        "is_mandatory": True
    },
    
    # UNITED STATES
    {
        "country_code": "US",
        "rule_code": "FLSA",
        "rule_name": "Fair Labor Standards Act",
        "rule_category": "LABOR",
        "description": "Federal minimum wage and overtime requirements",
        "legal_reference": "Fair Labor Standards Act of 1938",
        "thresholds": {
            "federal_minimum_wage": 7.25,
            "overtime_threshold_weekly_hours": 40,
            "overtime_rate_multiplier": 1.5,
            "salary_threshold_exempt": 35568
        },
        "regulatory_authority": "U.S. Department of Labor",
        "authority_website": "https://www.dol.gov",
        "effective_from": date(2020, 1, 1),
        "is_mandatory": True
    },
    {
        "country_code": "US",
        "rule_code": "CCPA",
        "rule_name": "California Consumer Privacy Act",
        "rule_category": "DATA_PROTECTION",
        "description": "California data privacy requirements",
        "legal_reference": "California Consumer Privacy Act of 2018",
        "requirements": {
            "applies_to_revenue_threshold": 25000000,
            "applies_to_data_threshold": 50000,
            "right_to_know": True,
            "right_to_delete": True,
            "right_to_opt_out": True,
            "non_discrimination": True
        },
        "compliance_frameworks": ["CCPA"],
        "regulatory_authority": "California Attorney General",
        "effective_from": date(2020, 1, 1),
        "is_mandatory": True
    },
    {
        "country_code": "US",
        "rule_code": "SOX",
        "rule_name": "Sarbanes-Oxley Act",
        "rule_category": "CORPORATE",
        "description": "Financial reporting and internal controls for public companies",
        "legal_reference": "Sarbanes-Oxley Act of 2002",
        "requirements": {
            "internal_controls_required": True,
            "ceo_cfo_certification": True,
            "audit_committee_required": True,
            "whistleblower_protection": True
        },
        "compliance_frameworks": ["SOX"],
        "regulatory_authority": "Securities and Exchange Commission (SEC)",
        "authority_website": "https://www.sec.gov",
        "effective_from": date(2002, 7, 30),
        "is_mandatory": True
    },
    
    # AUSTRALIA
    {
        "country_code": "AU",
        "rule_code": "NES",
        "rule_name": "National Employment Standards",
        "rule_category": "LABOR",
        "description": "Minimum employment conditions for all employees",
        "legal_reference": "Fair Work Act 2009",
        "requirements": {
            "max_weekly_hours": 38,
            "annual_leave_weeks": 4,
            "personal_leave_days": 10,
            "parental_leave_weeks": 12,
            "long_service_leave": True,
            "public_holidays": True,
            "notice_of_termination": True,
            "redundancy_pay": True
        },
        "regulatory_authority": "Fair Work Commission",
        "authority_website": "https://www.fwc.gov.au",
        "effective_from": date(2010, 1, 1),
        "is_mandatory": True
    },
    {
        "country_code": "AU",
        "rule_code": "PRIVACY_ACT",
        "rule_name": "Privacy Act",
        "rule_category": "DATA_PROTECTION",
        "description": "Australian Privacy Principles",
        "legal_reference": "Privacy Act 1988",
        "requirements": {
            "applies_to_revenue_threshold": 3000000,
            "data_breach_notification_required": True,
            "australian_privacy_principles": 13
        },
        "compliance_frameworks": ["APP"],
        "regulatory_authority": "Office of the Australian Information Commissioner (OAIC)",
        "authority_website": "https://www.oaic.gov.au",
        "effective_from": date(2014, 3, 12),
        "is_mandatory": True
    },
    
    # INDIA
    {
        "country_code": "IN",
        "rule_code": "SHOPS_ESTABLISHMENTS",
        "rule_name": "Shops and Establishments Act",
        "rule_category": "LABOR",
        "description": "Working hours and leave for commercial establishments",
        "legal_reference": "State-specific Shops and Establishments Acts",
        "requirements": {
            "max_working_hours_day": 9,
            "max_working_hours_week": 48,
            "weekly_holiday": True,
            "annual_leave_days": 15,
            "sick_leave_days": 12,
            "casual_leave_days": 12
        },
        "regulatory_authority": "State Labour Departments",
        "effective_from": date(2020, 1, 1),
        "is_mandatory": True
    },
    {
        "country_code": "IN",
        "rule_code": "PF_ESI",
        "rule_name": "Provident Fund and ESI",
        "rule_category": "PAYROLL",
        "description": "Employee Provident Fund and State Insurance contributions",
        "legal_reference": "EPF Act 1952, ESI Act 1948",
        "requirements": {
            "pf_employee_contribution": 12,
            "pf_employer_contribution": 12,
            "pf_threshold_employees": 20,
            "esi_employee_contribution": 0.75,
            "esi_employer_contribution": 3.25,
            "esi_wage_ceiling": 21000
        },
        "regulatory_authority": "EPFO and ESIC",
        "effective_from": date(2020, 1, 1),
        "is_mandatory": True
    },
]


# Document format requirements
DOCUMENT_FORMATS = [
    # SOUTH AFRICA
    {
        "country_code": "ZA",
        "document_type": "TAX_INVOICE",
        "document_name": "Tax Invoice",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_vat_number",
            "customer_name", "customer_address", "customer_vat_number",
            "invoice_number", "invoice_date", "description",
            "quantity", "unit_price", "vat_amount", "total_amount"
        ],
        "numbering_format": "INV-{YYYY}-{SEQ:6}",
        "numbering_rules": {"sequential": True, "reset_annually": False},
        "tax_display_requirements": {
            "show_vat_number": True,
            "show_vat_rate": True,
            "show_vat_amount": True,
            "vat_inclusive_pricing_allowed": True
        },
        "language_requirements": {"primary": "en", "allowed": ["en", "af", "zu"]},
        "retention_years": 5,
        "legal_text_requirements": ["VAT registration number must be displayed"],
        "effective_from": date(2018, 4, 1)
    },
    {
        "country_code": "ZA",
        "document_type": "PAYSLIP",
        "document_name": "Payslip",
        "mandatory_fields": [
            "employer_name", "employer_address", "employer_paye_number",
            "employee_name", "employee_id_number", "employee_tax_number",
            "pay_period", "gross_salary", "deductions", "net_salary",
            "paye", "uif_employee", "uif_employer"
        ],
        "language_requirements": {"primary": "en"},
        "retention_years": 5,
        "effective_from": date(2020, 1, 1)
    },
    
    # EUROPEAN UNION (e-invoicing requirements)
    {
        "country_code": "DE",
        "document_type": "INVOICE",
        "document_name": "Rechnung",
        "document_name_local": "Rechnung",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_vat_number",
            "customer_name", "customer_address",
            "invoice_number", "invoice_date", "delivery_date",
            "description", "quantity", "unit_price",
            "net_amount", "vat_rate", "vat_amount", "gross_amount"
        ],
        "numbering_format": "RE-{YYYY}-{SEQ:8}",
        "numbering_rules": {"sequential": True, "unique": True, "no_gaps": True},
        "tax_display_requirements": {
            "show_vat_number": True,
            "show_vat_rate": True,
            "show_vat_amount": True,
            "reverse_charge_text_required": True
        },
        "language_requirements": {"primary": "de", "allowed": ["de", "en"]},
        "digital_signature_required": False,
        "electronic_format": "ZUGFeRD",
        "e_invoicing_mandatory": True,
        "e_invoicing_platform": "Peppol",
        "retention_years": 10,
        "legal_text_requirements": [
            "Reverse charge notice for B2B cross-border",
            "Small business exemption notice if applicable"
        ],
        "effective_from": date(2020, 1, 1)
    },
    {
        "country_code": "FR",
        "document_type": "INVOICE",
        "document_name": "Facture",
        "document_name_local": "Facture",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_siret", "supplier_vat_number",
            "customer_name", "customer_address",
            "invoice_number", "invoice_date",
            "description", "quantity", "unit_price",
            "net_amount", "vat_rate", "vat_amount", "gross_amount",
            "payment_terms", "payment_due_date"
        ],
        "numbering_format": "FA-{YYYY}-{SEQ:6}",
        "numbering_rules": {"sequential": True, "chronological": True},
        "tax_display_requirements": {
            "show_vat_number": True,
            "show_vat_rate": True,
            "show_vat_amount": True,
            "show_vat_breakdown_by_rate": True
        },
        "language_requirements": {"primary": "fr", "allowed": ["fr", "en"]},
        "e_invoicing_mandatory": True,
        "e_invoicing_platform": "Chorus Pro",
        "retention_years": 10,
        "effective_from": date(2024, 7, 1)
    },
    {
        "country_code": "IT",
        "document_type": "INVOICE",
        "document_name": "Fattura",
        "document_name_local": "Fattura Elettronica",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_vat_number", "supplier_fiscal_code",
            "customer_name", "customer_address", "customer_vat_number",
            "invoice_number", "invoice_date",
            "description", "quantity", "unit_price",
            "net_amount", "vat_rate", "vat_amount", "gross_amount",
            "payment_method", "payment_terms"
        ],
        "numbering_format": "FE-{YYYY}-{SEQ:10}",
        "electronic_format": "FatturaPA XML",
        "e_invoicing_mandatory": True,
        "e_invoicing_platform": "Sistema di Interscambio (SDI)",
        "digital_signature_required": True,
        "retention_years": 10,
        "effective_from": date(2019, 1, 1)
    },
    
    # UNITED KINGDOM
    {
        "country_code": "GB",
        "document_type": "VAT_INVOICE",
        "document_name": "VAT Invoice",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_vat_number",
            "customer_name", "customer_address",
            "invoice_number", "invoice_date", "tax_point_date",
            "description", "quantity", "unit_price",
            "net_amount", "vat_rate", "vat_amount", "gross_amount"
        ],
        "numbering_format": "INV-{SEQ:6}",
        "numbering_rules": {"sequential": True, "unique": True},
        "tax_display_requirements": {
            "show_vat_number": True,
            "show_vat_rate": True,
            "show_vat_amount": True,
            "show_total_excluding_vat": True,
            "show_total_vat": True
        },
        "language_requirements": {"primary": "en"},
        "retention_years": 6,
        "effective_from": date(2021, 1, 1)
    },
    
    # UNITED STATES
    {
        "country_code": "US",
        "document_type": "INVOICE",
        "document_name": "Invoice",
        "mandatory_fields": [
            "supplier_name", "supplier_address",
            "customer_name", "customer_address",
            "invoice_number", "invoice_date",
            "description", "quantity", "unit_price", "total_amount",
            "payment_terms"
        ],
        "numbering_format": "INV-{YYYY}{MM}-{SEQ:5}",
        "tax_display_requirements": {
            "show_sales_tax_separately": True,
            "show_tax_jurisdiction": True
        },
        "language_requirements": {"primary": "en"},
        "retention_years": 7,
        "effective_from": date(2020, 1, 1)
    },
    
    # AUSTRALIA
    {
        "country_code": "AU",
        "document_type": "TAX_INVOICE",
        "document_name": "Tax Invoice",
        "mandatory_fields": [
            "supplier_name", "supplier_abn",
            "invoice_date", "description",
            "gst_amount", "total_amount"
        ],
        "header_requirements": {
            "must_state_tax_invoice": True,
            "abn_required": True
        },
        "tax_display_requirements": {
            "show_gst_amount": True,
            "gst_inclusive_pricing_common": True
        },
        "language_requirements": {"primary": "en"},
        "retention_years": 5,
        "effective_from": date(2000, 7, 1)
    },
    
    # INDIA
    {
        "country_code": "IN",
        "document_type": "GST_INVOICE",
        "document_name": "GST Tax Invoice",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_gstin",
            "customer_name", "customer_address", "customer_gstin",
            "invoice_number", "invoice_date",
            "hsn_sac_code", "description", "quantity", "unit_price",
            "taxable_value", "cgst_rate", "cgst_amount",
            "sgst_rate", "sgst_amount", "igst_rate", "igst_amount",
            "total_amount", "place_of_supply"
        ],
        "numbering_format": "{FY}/{SEQ:6}",
        "numbering_rules": {"sequential": True, "financial_year_based": True, "max_16_chars": True},
        "tax_display_requirements": {
            "show_gstin": True,
            "show_hsn_sac": True,
            "show_tax_breakdown": True,
            "show_place_of_supply": True
        },
        "language_requirements": {"primary": "en", "allowed": ["en", "hi"]},
        "e_invoicing_mandatory": True,
        "e_invoicing_platform": "GST Portal / IRP",
        "retention_years": 8,
        "effective_from": date(2020, 10, 1)
    },
    
    # UAE
    {
        "country_code": "AE",
        "document_type": "TAX_INVOICE",
        "document_name": "Tax Invoice",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_trn",
            "customer_name", "customer_address", "customer_trn",
            "invoice_number", "invoice_date",
            "description", "quantity", "unit_price",
            "taxable_amount", "vat_rate", "vat_amount", "total_amount"
        ],
        "numbering_format": "INV-{YYYY}-{SEQ:8}",
        "tax_display_requirements": {
            "show_trn": True,
            "show_vat_rate": True,
            "show_vat_amount": True,
            "currency_must_be_aed_or_converted": True
        },
        "language_requirements": {"primary": "ar", "allowed": ["ar", "en"]},
        "retention_years": 5,
        "effective_from": date(2018, 1, 1)
    },
    
    # SAUDI ARABIA
    {
        "country_code": "SA",
        "document_type": "TAX_INVOICE",
        "document_name": "Tax Invoice",
        "document_name_local": "فاتورة ضريبية",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_vat_number",
            "customer_name", "customer_address", "customer_vat_number",
            "invoice_number", "invoice_date", "invoice_date_hijri",
            "description", "quantity", "unit_price",
            "taxable_amount", "vat_rate", "vat_amount", "total_amount",
            "qr_code"
        ],
        "numbering_format": "INV-{YYYY}-{SEQ:10}",
        "tax_display_requirements": {
            "show_vat_number": True,
            "show_vat_rate": True,
            "show_vat_amount": True,
            "qr_code_required": True
        },
        "language_requirements": {"primary": "ar", "secondary": "en"},
        "e_invoicing_mandatory": True,
        "e_invoicing_platform": "ZATCA FATOORA",
        "digital_signature_required": True,
        "retention_years": 6,
        "effective_from": date(2021, 12, 4)
    },
    
    # SINGAPORE
    {
        "country_code": "SG",
        "document_type": "TAX_INVOICE",
        "document_name": "Tax Invoice",
        "mandatory_fields": [
            "supplier_name", "supplier_address", "supplier_gst_number",
            "customer_name", "customer_address",
            "invoice_number", "invoice_date",
            "description", "quantity", "unit_price",
            "gst_amount", "total_amount"
        ],
        "numbering_format": "INV{YYYY}{SEQ:6}",
        "tax_display_requirements": {
            "show_gst_registration_number": True,
            "show_gst_amount": True,
            "gst_inclusive_or_exclusive_must_be_stated": True
        },
        "language_requirements": {"primary": "en"},
        "retention_years": 5,
        "effective_from": date(2024, 1, 1)
    },
]


def get_country_config(country_code: str) -> dict:
    """Get configuration for a specific country"""
    for config in COUNTRY_CONFIGS:
        if config["country_code"] == country_code:
            return config
    return None


def get_tax_rules(country_code: str) -> list:
    """Get all tax rules for a specific country"""
    return [rule for rule in TAX_RULES if rule["country_code"] == country_code]


def get_statutory_rules(country_code: str) -> list:
    """Get all statutory rules for a specific country"""
    return [rule for rule in STATUTORY_RULES if rule["country_code"] == country_code]


def get_document_formats(country_code: str) -> list:
    """Get all document format requirements for a specific country"""
    return [fmt for fmt in DOCUMENT_FORMATS if fmt["country_code"] == country_code]


def get_all_countries() -> list:
    """Get list of all supported countries"""
    return [{"code": c["country_code"], "name": c["country_name"], "currency": c["currency_code"]} 
            for c in COUNTRY_CONFIGS]


def get_countries_by_region(region: str) -> list:
    """Get countries filtered by region"""
    return [c for c in COUNTRY_CONFIGS if c.get("region") == region]


def get_countries_by_tax_system(tax_system: str) -> list:
    """Get countries filtered by tax system"""
    return [c for c in COUNTRY_CONFIGS if c.get("tax_system") == tax_system]
