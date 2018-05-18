import React from 'react'

class Main extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <form action="/api/realestate" method="post" enctype="multipart/form-data">
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