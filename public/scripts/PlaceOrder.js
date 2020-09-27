
const Order = [];

function addItem(position){

        const Dish = document.getElementById('DishName'+position);
        const Quantity = document.getElementById('Quantity'+position);
        const Price = document.getElementById('DishPrice'+position);
        
        let counter = 0;
        for(var i = 0 ; i < Order.length ; i++){
              counter++;
              if(Order[i].Dish === Dish.innerHTML){
                    Order[i].Quantity = Quantity.innerHTML;
                    counter = 0;
                    break;
              }
        }
        if(counter == Order.length){
              Order.push({Dish : Dish.innerHTML , Quantity : Quantity.innerHTML , Price : Price.innerHTML});
        }
        getOrders();
}
  
function increment(position){
        const obj = document.getElementById('Quantity'+position);
        let num = Number.parseInt(obj.innerText);
        num = num + 1;
        obj.innerHTML = num;
        addItem(position)
}
  
function decrement(position){
        const obj = document.getElementById('Quantity'+position);
        let num = Number.parseInt(obj.innerText);
        num = num - 1;
        if(num < 0){
              obj.innerHTML = 0
        }else{
              obj.innerHTML = num;
              addItem(position)
        }
}

function getOrders(){

        const listv = document.getElementById('appendO');
        listv.innerHTML = "";
        const FinalOrder = [];
        for(var k = 0 ; k < Order.length ; k++){
                if(Order[k].Quantity != "0"){
                        var node = document.createElement("li");
                        FinalOrder.push(Order[k]);
                        const temp = listv.appendChild(node);
                        temp.innerText = Order[k].Dish + " - " + Order[k].Quantity 
                        + " (" + (Order[k].Price * Order[k].Quantity) + ")";
                        temp.setAttribute('id',k);
                }
        }
        if(FinalOrder.length > 0){
                document.getElementById("PO").disabled = false;
        }else{
                document.getElementById("PO").disabled = true;
        }
        const ParentDiv = document.getElementById("FinalOrders");
        ParentDiv.innerHTML = "";
        for(var i = 0 ; i < FinalOrder.length ; i++){
                var row = document.createElement('div');
                row.setAttribute('class' , 'row');
                
                ParentDiv.appendChild(row);
                
                var childdiv = document.createElement('div');
                childdiv.setAttribute('class','col-6 mFont');
                childdiv.innerHTML = FinalOrder[i].Dish;

                row.appendChild(childdiv);

                var childdiv2 = document.createElement('div');
                childdiv2.setAttribute('class','col-3 mFont');
                childdiv2.innerHTML = FinalOrder[i].Quantity;

                row.appendChild(childdiv2);

                var childdiv3 = document.createElement('div');
                childdiv3.setAttribute('class','col-3 mFont');
                childdiv3.innerHTML = FinalOrder[i].Quantity * FinalOrder[i].Price;

                row.appendChild(childdiv3);
        }
        var subTotal = 0;
        for(var i = 0 ; i < FinalOrder.length ; i++){
                subTotal += FinalOrder[i].Quantity * FinalOrder[i].Price;
        }

        document.getElementById('subTotal').innerHTML = subTotal;
        document.getElementById('ServiceFee').innerHTML = Math.round((0.02*subTotal + Number.EPSILON) * 100) / 100;
        document.getElementById('cgst').innerHTML = Math.round((0.025*subTotal + Number.EPSILON) * 100) / 100;
        document.getElementById('sgst').innerHTML = Math.round((0.025*subTotal + Number.EPSILON) * 100) / 100;
        document.getElementById('finalTotal').innerHTML =Math.round((1.07*subTotal + Number.EPSILON) * 100) / 100;
}

function payBill(){
        
        const FinalOrder = [];
        for(var k = 0 ; k < Order.length ; k++){
                if(Order[k].Quantity != "0"){
                        FinalOrder.push(Order[k]);
                }
        }
        if(document.getElementById('CustName').value.length == 0){
                
                document.getElementById("Message").style.display = "block";
                document.getElementById("Message").innerText = "Enter all Fields";

        }else if(document.getElementById('TableNo').value.length == 0){

                document.getElementById("Message").style.display = "block";
                document.getElementById("Message").innerText = "Enter all Fields";
	}else if(document.getElementById('TableNo').value > document.getElementById('tableLen').innerText){
		        document.getElementById("Message").style.display = "block";
	                document.getElementById("Message").innerText = "Table Number not available.";
        }else{
                axios.post('/PlaceOrder',{
                    
                        Dish : FinalOrder,
                        TableNo : document.getElementById('TableNo').value,
                        TotalBill : document.getElementById('finalTotal').innerText,
                        SubTotal : document.getElementById('subTotal').innerText,
                        CustomerName : document.getElementById('CustName').value,
                        
                }).then((response)=>{
                        if(response.data === "Done"){
                                window.location = "/Table";
                        }
                });
        }
}


function filterItems(){
      
        var input, filter,i, j, temp, NoOfDishes, h3, hr;
        input = document.getElementById('DishToSearch');
        filter = input.value.toUpperCase();
        NoOfDishes = document.getElementById("disheslen").innerText;
        h3 = document.getElementsByTagName("h3");
        hr = document.getElementsByClassName("categorical-line");
        for(i = 0 ; i < h3.length ; i++){
		if(h3[i] && hr[i]){
                if(filter === ""){
                        h3[i].style.display = "";
                        hr[i].style.display = "";
                }
                else{
                        h3[i].style.display = "none";
                        hr[i].style.display = "none";
                }
		}
        }
        for(j = 1 ; j <= NoOfDishes; j++){
                        
                temp = document.getElementById("DishName"+j);

                if (temp.innerText.toUpperCase().indexOf(filter) > -1) {
                                
                        temp.parentElement.parentElement.style.display = "";

                } else {
                                
                        temp.parentElement.parentElement.style.display = "none";
                }
        }
}