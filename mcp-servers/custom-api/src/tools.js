const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254']
const PRIVATE_IP_REGEX = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/

export async function callApi({ method, url, headers = {}, body = null, timeout = 30000 }) {
  try {
    // Security: Validate URL
    const parsedUrl = new URL(url)

    // Block private IPs and localhost
    if (BLOCKED_HOSTS.includes(parsedUrl.hostname) || PRIVATE_IP_REGEX.test(parsedUrl.hostname)) {
      throw new Error(`Access to private IP addresses is blocked: ${parsedUrl.hostname}`)
    }

    // Enforce HTTPS (except for known safe domains like jsonplaceholder)
    if (parsedUrl.protocol !== 'https:' && !parsedUrl.hostname.includes('jsonplaceholder')) {
      console.warn(`Warning: Non-HTTPS URL: ${url}`)
    }

    console.log(`${method} ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stepwise-Agent/1.0',
        ...headers
      },
      signal: controller.signal
    }

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body)
    }

    const startTime = Date.now()
    const response = await fetch(url, options)
    const duration = Date.now() - startTime

    clearTimeout(timeoutId)

    // Parse response
    const contentType = response.headers.get('content-type')
    let responseData

    if (contentType?.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      duration: `${duration}ms`,
      metadata: {
        method,
        url,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error(`API call error: ${error.message}`)

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Request timed out after ${timeout}ms`,
        status: 408,
        data: null
      }
    }

    return {
      success: false,
      error: error.message,
      status: 500,
      data: null
    }
  }
}
