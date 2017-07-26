var provider = new firebase.auth.GoogleAuthProvider();
        var database = firebase.database();
        var textInput = document.querySelector('#text');
        var postButton = document.querySelector('#post');
        var user;
        provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
   
        var loginButton = document.querySelector('#login');

      

        loginButton.addEventListener("click", function () {
            console.log("login button pressed");
            firebase.auth().signInWithPopup(provider).then(function (result) {
                console.log("clicked");
                // This gives you a Google Access Token. You can use it to access the Google API.
                var token = result.credential.accessToken;
                // The signed-in user info.
                 user = result.user;
                // ...
            }).catch(function (error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorMessage);
                // The email of the user's account used.
                var email = error.email;
                // The firebase.auth.AuthCredential type that was used.
                var credential = error.credential;
                // ...
            });
        });
        firebase.auth().getRedirectResult().then(function (result) {
            if (result.credential) {
                // This gives you a Google Access Token. You can use it to access the Google API.
                var token = result.credential.accessToken;
                // ...
            }
            // The signed-in user info.
            var user = result.user;
        }).catch(function (error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            console.log(errorMessage);
            // The email of the user's account used.
            var email = error.email;
            // The firebase.auth.AuthCredential type that was used.
            var credential = error.credential;
            // ...
            });

        function writeNewPost( user, username, body) {
            // A post entry.
            var postData = {
                uid : user,
                author: username,
                body: body,
                starCount: 0,         
            };

            // Get a key for a new Post.
            var newPostKey = firebase.database().ref().child('posts').push().key;

            // Write the new post's data simultaneously in the posts list and the user's post list.
            var updates = {};
            updates['/posts/' + newPostKey] = postData;
            updates['/user-posts/' + user + '/' + newPostKey] = postData;

            return firebase.database().ref().update(updates);
        }
        postButton.addEventListener("click", writeUserData("test", textInput)); 
