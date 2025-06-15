const url = `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/upload`

const uploadFile = async(file) => {
    if (!file) throw new Error('No file provided')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET)
    formData.append('api_key', process.env.REACT_APP_CLOUDINARY_API_KEY)
    formData.append('timestamp', Math.floor(Date.now() / 1000).toString())

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        })
        
        if (!response.ok) {
            const errorData = await response.json()
            console.error('Cloudinary error:', errorData)
            throw new Error(errorData.error?.message || 'Failed to upload file to Cloudinary')
        }
        
        const responseData = await response.json()
        return responseData
    } catch (error) {
        console.error('Upload error:', error)
        throw error
    }
}

export default uploadFile