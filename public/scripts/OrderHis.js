function filterItems(){
        var input, filter, ul, li, a, i, txtValue;
        input = document.getElementById("SearchDish");
        filter = input.value.toUpperCase();
        li = document.getElementsByClassName('tableRow');

        for (i = 0; i < li.length; i++) {
                a = li[i].getElementsByClassName("SearchByDate")[0];
                txtValue = a.textContent || a.innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        li[i].style.display = "";
                } else {
                        li[i].style.display = "none";
                }
        }
}