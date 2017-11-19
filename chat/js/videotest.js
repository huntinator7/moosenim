var video = document.getElementById('video'),
    vendorUrl = window.URL || window.webkitURL;
navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

navigator.getMedia(
    {
        video: true,
        audio: true
    },
    function (stream) {
        console.log(stream);
        video.src = vendorUrl.createObjectURL(stream);
        video.play();
    },
    function (err) {
        console.log(err.code);
    }
);