function preview() {
        imagePreview.src=URL.createObjectURL(event.target.files[0]);
        const filesize = ((event.target.files[0].size/1024)/1024).toFixed(4); 
        if(filesize > 5){
              $('#Message').css('color','var(--dark-red)');
              $('#statImage').attr('class','fa fa-times');
              $('#UploadImage').prop('disabled',true);
        }else{
              $('#Message').css('color','var(--theme-green)');
              $('#statImage').attr('class','fa fa-check-circle');
              $('#UploadImage').prop('disabled',false);
        }
}

function check(){
    var input1 = document.getElementById('accountNum').value;
    var input2 = document.getElementById('accountNum2').value;
    if(input1 === input2){
        document.getElementById('AddAccount').disabled = false;
        $('#accountNum2').attr('class','customInput mFont');
    }else{
    	document.getElementById('AddAccount').disabled = true;
        $('#accountNum2').attr('class','customInput mFont errorInput');
    }
}