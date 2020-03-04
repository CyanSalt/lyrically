export function fetchify(request) {
  return (...args) => new Promise((resolve, reject) => {
    request(...args, response => {
      let data = ''
      response.on('data', chunk => {
        data += chunk
      })
      response.on('end', () => {
        resolve(new Response(data, {
          status: response.statusCode,
          headers: response.headers,
        }))
      })
    }).on('error', reject)
  })
}
