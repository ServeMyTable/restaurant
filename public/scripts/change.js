function check(e){
        e.preventDefault();
        const password = document.getElementById('p').value;
        const Cpassword = document.getElementById('cp').value;
        if(password === Cpassword){
                document.getElementById("myForm").submit();
        }else{
                
                myFunction('Password and Confirm Password does not matched');
        }
}
function myFunction(message) {
        
        var x = document.getElementById("snackbar");
        x.innerHTML = message;
        x.className = "show";
        setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}