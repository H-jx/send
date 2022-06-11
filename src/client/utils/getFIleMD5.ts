import SparkMD5 from 'spark-md5'

export function getFileMD5(file: File) {
  return new Promise<string>((resolve, reject) => {
    const blobSlice = File.prototype.slice

    const chunkSize = 2097152 // Read in chunks of 2M
    const chunks = Math.ceil(file.size / chunkSize)
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()
    let currentChunk = 0

    fileReader.onload = function (e) {
      spark.append(e.target?.result as ArrayBuffer) // Append array buffer
      currentChunk++
      if (currentChunk < chunks) {
        loadNext()
      } else {
        resolve(spark.end())
      }
    }

    fileReader.onerror = function (error) {
      reject(error)
    }

    function loadNext() {
      const start = currentChunk * chunkSize,
        end = start + chunkSize >= file.size ? file.size : start + chunkSize

      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end))
    }

    loadNext()
  })
}
