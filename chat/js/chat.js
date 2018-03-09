$(function () {
    var event
    var last_id
    var retrieving = false
    var first_id
    var saved_first = "messages"
    var retrievePrevious = false
    var URL_SERVER = 'https://moosen.im:443'
    var socket = io.connect(URL_SERVER)
    var doRegex = true
    var roomCommands = []
    var roomRegex = []
    var curroom
    var canAuto = false
    var canScroll = 10

    var css = {
        backImg: "",
        back1: "#23ffdd",
        back2: "#6eb7ff",
        text1: "#000000",
        text2: "#444444",
        mb1: "rgba(0, 0, 0, 0.25)",
        mb2: "rgba(255, 255, 255, 0.25)",
    }

    handleCSS()

    var siofu = new SocketIOFileUpload(socket)
    siofu.addEventListener("start", event => {
        event.file.meta.filetype = event.file.type
        event.file.meta.room = curroom
    })

    $.fn.textWidth = function () {
        var text = $(this).html()
        $(this).html('<span>' + text + '</span>')
        var width = $(this).find('span:first').width()
        $(this).html(text)
        return width
    }

    $(document).ready(function () {
        // run test on initial page load
        checkSize()
        // run test on resize of the window
        $(window).resize(checkSize)
    })
    //Function to the css rule
    function checkSize() {
        if ($(".mm-navdd").css("max-width") !== "none") {
            $(".bmd-layout-container").addClass("bmd-drawer-overlay")
        } else {
            $(".bmd-layout-container").removeClass("bmd-drawer-overlay")
        }
    }

    var login = new Audio('../sounds/notification.mp3')
    var audio = new Audio('../sounds/login3.mp3')
    // roomList holds an array of all chatrooms a user has access to.
    // var roomList


    $('#email').submit(function () {
        socket.emit('adduser', $('#e').val(), curroom, 0)
        console.log("form submitted " + $('#e').val())
        $('#add-modal').modal('hide')
        return false
    })
    $('#profile-form').submit(function () {
        socket.emit('updateuser', $('#nick-name').val(), $('#img-url').val())
        console.log("form submitted " + $('#e').val())
        $('#modal-profile').modal('hide')
        return false
    })
    $('#jc-form').submit(function () {
        console.log('In jc-form submit')
        socket.emit('joincode', $('#jc').val(), curroom, 0)
        console.log("jc-form submitted " + $('#e').val())
        $('#joincode-modal').modal('hide')
        return false
    })
    $('#room-color').submit(function () {
        socket.emit('updateroomtheme', [$('#back-color1').val(), $('#back-color2').val(), null,
        $('#text-color').val(), $('#text-color').val(), $('#msg-color1').val(), $(
            '#msg-color2').val(), $('#msg-trans')[0].checked
        ], null, 1, curroom)
        console.log('room-color submitted')
        $('#color-modal').modal('hide')
        return false
    })
    $('#newcommand-form').submit(function () {
        socket.emit('addcommand', curroom, $('#nc-cmd').val(), $('#nc-actn').val(), $('#nc-msg')
            .val(), $('#nc-username').val(), $('#nc-pic').val(), $('#nc-regex')[0].checked)
        console.log("form submitted " + $('#nc-cmd').val())
        $('#regex-modal').modal('hide')
        return false
    })
    $('#nc-actn').change(function () {
        if ($('#nc-actn').val() == 'Respond') {
            $("#nc-username").prop('disabled', false)
            $("#nc-pic").prop('disabled', false)
        } else {
            $("#nc-username").prop('disabled', true)
            $("#nc-pic").prop('disabled', true)
        }
        return false
    })

    $('#roomname').submit(function () {
        socket.emit('addroom', $('#rn').val())
        console.log("add room form submitted " + $('#rn').val())
        $('#modal2').modal('hide')
        return false
    })

    $('.mm-form').submit(function (e) {
        e.preventDefault()
        var message = $('#send-message').val()
        if (/\S/.test(message)) {
            try {
                socket.emit('chat message', message, curroom)
            } catch (e) {
                console.log(e)
            }
            checkScroll()
            autosize(document.querySelectorAll('textarea'))
            $('#send-message').val('')
            return false
        }
        return false
    })

    $('#send-message').on('input', function () {
        $(this).scrollTop($('.main')[0].scrollHeight)
    })

    $('#send-message').keypress(function (e) {
        if (e.which == 13 && !e.shiftKey) {
            $(this).closest('form').submit()
            e.preventDefault()
        }
    })

    $(document).ready(function () {
        $('.mm-side-item-text').each(function (index) {
            $(this).css('font-size', '1em')
            while ($(this).textWidth() > $('#dw-s1').width() * 0.65) {
                $(this).css('font-size', (parseInt($(this).css('font-size')) - 1) +
                    "px")
            }
        })
    })

    autosize(document.querySelectorAll('textarea'))

    var last_scroll_position = 0

    $('main').scroll(function () {
        if ($('main').scrollTop() + $('main').height() >= $('main').prop('scrollHeight') - 300) {
            if (!canAuto) {
                canAuto = true
                // console.log('canAuto true')
            }
        } else if (canAuto) {
            canAuto = false
            // console.log('canAuto false')
        }
        if ($('main').scrollTop() == 0 && $('main').scrollTop() - last_scroll_position < 0) {
            $('main').scrollTop(1)
            if (canScroll >= 10) {
                canScroll = 0
                socket.emit('retPre', first_id, curroom)
            } else {
                console.log('Couldn\'t scroll: ' + canScroll)
            }
        }
        last_scroll_position = $('main').scrollTop()
    })

    $(window).resize(function () { //checking for window resize event
        if ($("#send-message").is(":focus")) {
            $('main').scrollTop($('main').prop("scrollHeight"))
        }
    })

    // socket.on('motd update', (msg, room) => {
    //     console.log('Received MOTD: ' + msg)
    //     roomnames.forEach(e => {
    //         if (e.id == curroom) $('#roomtitle').html('<h3>' + e.name + '</h3>')
    //     })
    //     $('#motd').html("<div>" + msg + "</div>")
    //     $(function () {
    //         $('#motd div').css('font-size', '3.3em')

    //         while ($('#motd div').height() > $('#motd').height()) {
    //             $('#motd div').css('font-size', (parseInt($('#motd div').css('font-size')) - 1) + "px")
    //         }
    //     })
    // })

    socket.on('get commands', commandsArr => {
        roomCommands = []
        roomRegex = []
        commandsArr.forEach(e => {
            if (e.cmd.substr(0, 1) == "!") {
                // console.log(e)
                roomCommands.push(e)
            } else {
                roomRegex.push(e)
            }
        })
    })

    socket.on('chat message', (user, msg, time, id, pic, room, badge) => {
        if (!curroom || curroom == room) {
            if (!curroom) {
                curroom = room
            }

            checkRegex(checkTags)

            function checkRegex(cb) {
                var sendmsg = msg
                var regexes = [{
                    'x': 'https?:\\/\\/(?!.*(gfycat\\.|youtu\\.|youtube\\.|cdn\\.discordapp\\.com\\/emojis))\\S*\\.(jpg|gif|png|svg)\\S*',
                    'r': "<img class='materialboxed responsive-img mm-embed' src='$&' alt='$&'>"
                },
                {
                    'x': '\\S+gfycat\\.com\\/(gifs\\/detail\\/)?(\\S+)',
                    'r': '$& <br><div class="embed-responsive embed-responsive-16by9 mm-videoembed"><iframe class="embed-responsive-item" src="https://gfycat.com/ifr/$2" allowfullscreen></iframe></div>'
                },
                {
                    'x': 'https\\S*youtube\\.com\\/watch\\?v=(\\S*)',
                    'r': '$& <br><div class="embed-responsive embed-responsive-16by9 mm-videoembed"><iframe class="embed-responsive-item" src="https://www.youtube.com/embed/$1?rel=0" allowfullscreen></iframe></div>'
                },
                {
                    'x': 'https\\S*youtu\\.be\\/(\\S{11})',
                    'r': '$& <br><div class="embed-responsive embed-responsive-16by9 mm-videoembed"><iframe class="embed-responsive-item" src="https://www.youtube.com/embed/$1?rel=0" allowfullscreen></iframe></div>'
                },
                {
                    'x': '([^\'"]|^)(http\\S+\\.\\S+)(\\s|$)',
                    'r': "$1<a href='$2' target='_blank'>$2</a>$3"
                },
                ]
                regexes.forEach(e => {
                    const promise = new Promise((resolve, reject) => {
                        var reg = new RegExp(e.x, 'ig')
                        sendmsg = sendmsg.replace(reg, e.r)
                        resolve()
                    })
                })

                if (doRegex) {
                    if (sendmsg.substr(0, 1) == "!") {
                        var command = /\S+/i.exec(sendmsg)
                        roomCommands.forEach(e => {
                            if (command[0] == e.cmd) {
                                switch (e.actn) {
                                    case "Replace":
                                        sendmsg = e.msg
                                        break
                                    case "ReplaceWhole":
                                        sendmsg = e.msg
                                        break
                                    case "Respond":
                                        sendResponse(e, id + 0.5)
                                        break
                                    default:
                                        break
                                }
                            }
                        })
                    } else {
                        roomRegex.forEach(e => {
                            var re = new RegExp('(^|\\s)(' + e.cmd + ')($|\\s)',
                                'ig')
                            var testedPositive = re.test(sendmsg)
                            if (testedPositive) {
                                switch (e.actn) {
                                    case "Replace":
                                        sendmsg = sendmsg.replace(re,
                                            `$1${e.msg}$3`)
                                        break
                                    case "ReplaceWhole":
                                        sendmsg = e.msg
                                        break
                                    case "Respond":
                                        sendResponse(e, id + 0.5)
                                        break
                                    default:
                                        break
                                }
                            }
                        })
                    }
                }
                cb(sendmsg, doRest)
            }

            function checkTags(newMsg, cb) {
                cb(newMsg)
            }

            async function sendResponse(e, thisId) {
                await sleep(750)
                insertMessage('<li id="' + thisId +
                    '" class="mm-collection-item avatar"><img src="' + e.pic +
                    '" alt="" class="circle msg-icon"><span class="title" id="msgtitle">' +
                    e.username +
                    ' <span class="badge badge-dark">Bot</span></span><p class="message">' +
                    e.msg + '</p><span class="secondary-content">' +
                    time + '</a></li>', thisId, e.username, e.msg)
            }

            function doRest(newMsg) {
                if (!newMsg) {
                    newMsg = "Server down for testing"
                }
                if (!retrieving) {
                    retrieving = true
                    if ($('#messages').children().first().attr('id')) {
                        saved_first = $('#messages').children().first().attr('id')
                    }
                    pageJump()
                }
                if (document.hidden) {
                    notifyMe(newMsg, pic)
                    login.play()
                }
                const badgeCheck = new Promise((resolve) => {
                    if (badge) {
                        // console.log('HAS BADGE: ' + badge)
                        resolve(user + ` <span class="badge ${badge}">${badge}</span>`)
                    } else {
                        // console.log('HAS NO BADGE: ' + badge)
                        resolve(user)
                    }
                })
                    .then((userStr) => {
                        if (!first_id) {
                            first_id = id
                            $('#messages').append('<li id="' + id +
                                '" class="mm-collection-item avatar"><img src="' + pic +
                                '" alt="" class="circle msg-icon"><span class="title" id="msgtitle">' +
                                userStr + '</span><p class="message">' +
                                newMsg + '</p><span class="secondary-content">' +
                                time + '</a></li>')
                            document.title = user.replace(/ .*/, '') + ': ' + newMsg
                            handleMessageCSS()
                        } else {
                            insertMessage('<li id="' + id +
                                '" class="mm-collection-item avatar"><img src="' + pic +
                                '" alt="" class="circle msg-icon"><span class="title" id="msgtitle">' +
                                userStr + '</span><p class="message">' +
                                newMsg + '</p><span class="secondary-content">' +
                                time + '</a></li>', id, user, newMsg)
                            if (first_id > id) {
                                first_id = id
                            }
                        }
                    })
                $('.materialboxed').materialbox()
            }
        } else {
            console.log($("a[room='" + room + "']").parent())
            if ($("a[room='" + room + "']").parent().has('.notify-msg').length >= 1) {
                console.log("This has a notification already")
            } else {
                $("a[room='" + room + "']").parent().append('<div class="notify notify-msg"></div>')
            }
        }
    })

    socket.on('login', (displayName, email, photoURL, userId, room) => {
        console.log("Logging in " + displayName + ", email: " + email + " " + userId)
        if (room == curroom) {
            $('#mm-side-list-2').append(
                `<li class="nav-item mm-side-image"><img src="${photoURL}" alt="" class="circle img-fluid"><a class="nav-link mm-side-item-text" data-toggle="drawer" data-target="#dw-s2" user="${userId}">${displayName}</a></li>`
            )
            checkScroll()
            if (document.hidden) {
                login.play()
            }
        }
    })

    socket.on('test', name => {
        console.log(name + "asdasd")
    })

    socket.on('disconnect', name => {
        location.reload()
    })

    socket.on('roomlist', list => {

        $('#mm-side-list').empty()
        try {
            list.forEach(e => {
                var roomlist = {
                    name: e.name,
                    id: e.serialid,
                    isAdmin: e.is_admin
                }

                // console.log('color:' + e.back1)

                if (e.serialid == curroom) $('#title').html(e.name)


                $('#mm-side-list').append(
                    `<li class="btn nav-item mm-side-image"><img src="https://www.moosen.im/images/favicon.png" alt="" class="circle img-fluid"><a class="nav-link mm-side-item-text" data-toggle="drawer" data-target="#dw-s1" room="${e.serialid}">${e.name}</a></li>`
                )
            })
            $('.mm-side-item-text').each(function (index) {
                $(this).css('font-size', '1em')
                while ($(this).textWidth() > $('#dw-s1').width() * 0.65) {
                    $(this).css('font-size', (parseInt($(this).css('font-size')) - 1) +
                        "px")
                }
            })
        } catch (e) { }
    })

    $('#mm-side-list').on('click', 'a', function () {
        console.log("Room Button Clicked")
        $(this).parent().children().remove('.notify')
        socket.emit('changerooms', $(this.attributes.room).val())
    })

    socket.on('switchToRoom', async function (admin, room) {
        // console.log(admin)
        // console.log(room)
        if (!admin) {
            $("#room-commands").css("display", "none")
            $("#room-custom").css("display", "none")
        } else {
            $("#room-commands").css("display", "block")
            $("#room-custom").css("display", "block")
        }

        $('#messages').empty()
        $('#send-message').val('')
        $('#jc-room').html(room.join_code)
        $('#title').html(room.name)



        curroom = room.serialid
        first_id = null
        $('main').scrollTop(document.body.scrollHeight)

        if (room.back_img) css.backImg = room.back_img
        if (room.back2) {
            css.back2 = room.back2
            $('#back-color2').val(room.back2)
        }
        if (room.back1) {
            css.back1 = room.back1
            $('#back-color1').val(room.back1)
            if (!room.back2) {
                $('#back-color2').val(room.back1)
            }
        }
        if (room.text_color) {
            css.text1 = room.text_color
            $('#text-color').val(room.text_color)
        }
        if (room.text_color2) css.text2 = room.text_color2
        if (room.message_back) {
            css.mb1 =
                `rgba(${parseInt(room.message_back.substr(1, 2), 16)},
                        ${parseInt(room.message_back.substr(3, 2), 16)},
                        ${parseInt(room.message_back.substr(5, 2), 16)}, 0.25)`
            $('#msg-color1').val(room.message_back)
        } else {
            css.mb1 = "rgba(0, 0, 0, 0)"
            $('#msg-trans').prop('checked', true)
        }
        if (room.message_back2) {
            $('#msg-color2').val()
            css.mb2 =
                `rgba(${parseInt(room.message_back2.substr(1, 2), 16)},
                        ${parseInt(room.message_back2.substr(3, 2), 16)},
                        ${parseInt(room.message_back2.substr(5, 2), 16)}, 0.25)`
        } else {
            css.mb1 = "rgba(0, 0, 0, 0)"
            $('#msg-trans').prop('checked', true)
        }
        handleCSS()
        canScroll = 0
        await sleep(500)
        canScroll = 10
    })

    socket.on('retreat', function () {
        console.log("Retreat!")
        window.location.href = "https://www.moosen.im/login"
    })

    socket.on('logout message', user => {
        $('#messages').append(
            `<li id="${id}" class="mm-collection-item avatar">
                        <img src="${pic}" alt="" class="circle msg-icon">
                        <span class="title" id="msgtitle">${user}</span>
                        <p class="message">${user} logged out</p>
                        <a class="secondary-content">${time}</a></li>`
        )
        checkScroll()
    })

    sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

    async function insertMessage(msg, id, user, textMsg) {
        var wasInserted = false
        $('#messages li').each(function () {
            // console.log($(this.children[1]).text())
            if (id < this.id && !wasInserted) {
                $(msg).insertBefore(this)
                try {
                    // console.log($(this.previousElementSibling.children[1]).text())
                } catch (e) {
                    console.log('Couldn\'t print')
                }
                wasInserted = true
                checkScroll()
            }
        })

        if (!wasInserted) {
            $('#messages').append(msg)
            document.title = user.replace(/ .*/, '') + ': ' + textMsg
            checkScroll()
        }
        handleMessageCSS()

        await sleep(500)
        canScroll += 1
    }

    async function pageJump() {
        await sleep(500)
        retrieving = false
    }

    function checkScroll() {
        // console.log('canAuto: ' + canAuto)
        if (canAuto) {
            $('main').scrollTop($('main').prop("scrollHeight"))
        }
    }

    function handleCSS() {
        if (css.backImg) {
            $(".main").css("background-image", css.backImg)
            $(".navbar").css("background", css.back1)
        } else if (css.back2) {
            $(".main").css("background", `linear-gradient(to right, ${css.back1}, ${css.back2})`)
            $(".navbar").css("background", `linear-gradient(to right, ${css.back1}, ${css.back2})`)
        } else {
            $(".main").css("background", css.back1)
            $(".navbar").css("background", css.back1)
        }
        $(".mm-side").css("background-color", css.text1)
        $("#send-message").css("color", css.text1)
        $(".navbar a").css("color", css.text1)
        $(".navbar a i").css("color", css.text1)
        $(".navbar a button").css("color", css.text1)
        $(".mm-navdd button i").css("color", css.text1)
        $(".mm-side-image").css("color", css.back1)

        handleMessageCSS()
    }

    function handleMessageCSS() {
        $(".mm-collection .mm-collection-item>.message").css("color", css.text1)
        $(".mm-collection .mm-collection-item>.title").css("color", css.text2)
        $(".mm-collection .mm-collection-item>.secondary-content").css("color", css.text2)
        $(".mm-collection li:nth-child(even)").css("background-color", css.mb1)
        $(".mm-collection li:nth-child(odd)").css("background-color", css.mb2)
        $('.materialboxed').materialbox()
    }

    function handleFileSelect(evt) {
        console.log('In handleFileSelect')
        var files = evt.target.files // FileList object
        for (var i = 0; i < files.length; i++) {
            var name = files[i].name
            var type = files[i].type
            console.log("Filename: " + name + " , Type: " + type)
            siofu.submitFiles([files[i]])
        }
    }
    document.getElementById('add_pics').addEventListener('change', handleFileSelect, false)

    if (window.File && window.FileReader && window.FileList && window.Blob) {
        // Great success! All the File APIs are supported.
    } else {
        alert('The File APIs are not fully supported in this browser.')
    }

    // notification code
    document.addEventListener('DOMContentLoaded', function () {
        if (!Notification) {
            alert('dis broke as shit')
            return
        }
        if (Notification.permission !== "granted")
            Notification.requestPermission()
    })

    function notifyMe(msg, pic) {
        if (Notification.permission !== "granted")
            Notification.requestPermission()
        else {
            var notification = new Notification('Moosen IM', {
                icon: pic,
                body: msg,
            })
            notification.onclick = function () {
                window.focus()
            }
        }
    }
})