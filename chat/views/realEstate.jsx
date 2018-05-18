import React from 'react'

class Main extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            imageURL: '',
        }

        this.handleUploadImage = this.handleUploadImage.bind(this)
    }

    handleUploadImage(ev) {
        ev.preventDefault()

        const data = new FormData()
        data.append('files', this.uploadInput.files)

        fetch('https://moosen.im/api/realestate', {
            method: 'POST',
            body: data,
        })
    }

    render() {
        return (
            <form onSubmit={this.handleUploadImage}>
                <div>
                    <input ref={(ref) => { this.uploadInput = ref }} type="file" multiple />
                </div>
                <br />
                <div>
                    <button>Upload</button>
                </div>
            </form>
        )
    }
}

export default Main