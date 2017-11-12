
function User(displayName, email, photoURL, uid) {

    this.displayName = displayName;
    this.email = email;
    this.photoURL = photoURL;
    this.uid = uid;


    updatePhoto(newURL){
        this.photoURL = newURL;
    }



}