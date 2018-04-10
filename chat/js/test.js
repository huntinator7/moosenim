(function test () {
    try {
        document.write('Testing1')
        console.log('Testing2')
        this.innerHTML = 'Testing3'
        document.getElementById('1').innerHTML = 'Testing4'
    } catch (e) {
        console.log('Oops')
    }
})()


{/* <a onClick="this.id='a'">a</a> */}