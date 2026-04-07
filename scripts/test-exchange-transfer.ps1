param(
  [string]$BaseUrl = "http://192.168.0.24:8080",
  [string]$Email = "marko.petrovic@gmail.com",
  [string]$Password = "Password12",
  [decimal]$Amount = 500,
  [string]$FromCurrency = "USD",
  [string]$ToCurrency = "RSD",
  [string]$VerificationCode = ""
)

$ErrorActionPreference = "Stop"

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $requestParams = @{
    Method = $Method
    Uri = $Url
    Headers = $Headers
    ContentType = "application/json"
  }

  if ($null -ne $Body) {
    $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
  }

  return Invoke-RestMethod @requestParams
}

function Get-AccountsArray {
  param([object]$Response)

  if ($Response -is [System.Array]) {
    return $Response
  }

  if ($null -ne $Response.value) {
    return $Response.value
  }

  if ($null -ne $Response.data) {
    return $Response.data
  }

  return @()
}

function Get-AccountByCurrency {
  param(
    [object[]]$Accounts,
    [string]$Currency
  )

  return $Accounts | Where-Object {
    ($_.currency -eq $Currency) -or ($_.currency_code -eq $Currency)
  } | Select-Object -First 1
}

function Get-AccountNumber {
  param([object]$Account)

  if ($null -ne $Account.account_number -and "$($Account.account_number)" -ne "") {
    return $Account.account_number
  }

  return $Account.accountNumber
}

function Get-Balance {
  param([object]$Account)

  $raw = $Account.available_balance
  if ($null -eq $raw) {
    $raw = $Account.availableBalance
  }
  if ($null -eq $raw) {
    $raw = $Account.balance
  }

  return [decimal]$raw
}

Write-Host "Login na $BaseUrl za $Email ..."
$loginResponse = Invoke-JsonRequest -Method "POST" -Url "$BaseUrl/api/login" -Body @{
  email = $Email
  password = $Password
}

$accessToken = $loginResponse.access_token
if ([string]::IsNullOrWhiteSpace($accessToken)) {
  $accessToken = $loginResponse.accessToken
}

if ([string]::IsNullOrWhiteSpace($accessToken)) {
  throw "Login nije vratio access token."
}

$headers = @{
  Authorization = "Bearer $accessToken"
}

if (-not [string]::IsNullOrWhiteSpace($VerificationCode)) {
  $headers["TOTP"] = $VerificationCode.Trim()
}

Write-Host "Ucitavanje racuna pre transakcije ..."
$accountsBeforeResponse = Invoke-JsonRequest -Method "GET" -Url "$BaseUrl/api/accounts" -Headers $headers
$accountsBefore = @(Get-AccountsArray -Response $accountsBeforeResponse)

$fromAccount = Get-AccountByCurrency -Accounts $accountsBefore -Currency $FromCurrency
$toAccount = Get-AccountByCurrency -Accounts $accountsBefore -Currency $ToCurrency

if ($null -eq $fromAccount) {
  throw "Nije pronadjen izvorni racun za valutu $FromCurrency."
}

if ($null -eq $toAccount) {
  throw "Nije pronadjen odredisni racun za valutu $ToCurrency."
}

$fromNumber = Get-AccountNumber -Account $fromAccount
$toNumber = Get-AccountNumber -Account $toAccount
$fromBalanceBefore = Get-Balance -Account $fromAccount
$toBalanceBefore = Get-Balance -Account $toAccount

Write-Host "Pre transakcije:"
Write-Host "  $FromCurrency racun ($fromNumber): $fromBalanceBefore"
Write-Host "  $ToCurrency racun ($toNumber): $toBalanceBefore"

Write-Host "Preview konverzije ..."
$previewResponse = Invoke-JsonRequest -Method "POST" -Url "$BaseUrl/api/exchange/convert" -Headers $headers -Body @{
  fromAccountId = 0
  toAccountId = 0
  fromCurrency = $FromCurrency
  toCurrency = $ToCurrency
  amount = [double]$Amount
  from_account_id = 0
  to_account_id = 0
  from_currency = $FromCurrency
  to_currency = $ToCurrency
}

$convertedAmount = $previewResponse.converted_amount
if ($null -eq $convertedAmount) {
  $convertedAmount = $previewResponse.convertedAmount
}
if ($null -eq $convertedAmount) {
  $convertedAmount = $previewResponse.amount
}

$rate = $previewResponse.exchange_rate
if ($null -eq $rate) {
  $rate = $previewResponse.exchangeRate
}
if ($null -eq $rate) {
  $rate = $previewResponse.rate
}

Write-Host "Preview rezultat: converted_amount=$convertedAmount, rate=$rate"

Write-Host "Izvrsenje transfera ..."
$transferResponse = Invoke-JsonRequest -Method "POST" -Url "$BaseUrl/api/transactions/transfer" -Headers $headers -Body @{
  from_account = $fromNumber
  to_account = $toNumber
  amount = [double]$Amount
  description = "exchange $Amount $FromCurrency to $ToCurrency"
}

Write-Host "Transfer odgovor:"
$transferResponse | ConvertTo-Json -Depth 10

Write-Host "Ucitavanje racuna posle transakcije ..."
$accountsAfterResponse = Invoke-JsonRequest -Method "GET" -Url "$BaseUrl/api/accounts" -Headers $headers
$accountsAfter = @(Get-AccountsArray -Response $accountsAfterResponse)

$fromAfter = Get-AccountByCurrency -Accounts $accountsAfter -Currency $FromCurrency
$toAfter = Get-AccountByCurrency -Accounts $accountsAfter -Currency $ToCurrency

$fromBalanceAfter = Get-Balance -Account $fromAfter
$toBalanceAfter = Get-Balance -Account $toAfter

$expectedFrom = $fromBalanceBefore - $Amount
$deltaTo = $toBalanceAfter - $toBalanceBefore

Write-Host "Posle transakcije:"
Write-Host "  $FromCurrency racun ($fromNumber): $fromBalanceAfter"
Write-Host "  $ToCurrency racun ($toNumber): $toBalanceAfter"
Write-Host "  Ocekivani $FromCurrency saldo: $expectedFrom"
Write-Host "  Ostvareni priliv na ${ToCurrency}: $deltaTo"

if ($fromBalanceAfter -ne $expectedFrom) {
  throw "USD saldo nije azuriran kako se ocekuje. Ocekivano: $expectedFrom, dobijeno: $fromBalanceAfter"
}

if ($convertedAmount -ne $null -and ([decimal]$convertedAmount) -ne $deltaTo) {
  throw "RSD saldo nije uvecan za preview iznos. Ocekivano povecanje: $convertedAmount, dobijeno: $deltaTo"
}

Write-Host "PASS: menjacnica je upisala promenu u bazu."
