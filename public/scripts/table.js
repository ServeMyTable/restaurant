const socket = io();
socket.on('message',message=>{
        console.log(message);
        if(message.RestaurantID === document.getElementById('ResId').innerText){
                location.reload();
        }

});

function filterItems(){
        var input, filter, ul, li, a, i, txtValue;
        input = document.getElementById("SearchTable");
        filter = input.value.toUpperCase();
        ul = document.getElementById("ListOfTables");
        li = ul.getElementsByTagName('li');

        for (i = 0; i < li.length; i++) {
                a = li[i].getElementsByTagName("a")[0];
                txtValue = a.textContent || a.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        li[i].style.display = "";
                } else {
                        li[i].style.display = "none";
                }
        }
}