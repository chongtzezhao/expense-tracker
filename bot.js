var token = "<replace with token>";
var url = "https://api.telegram.org/bot"+token;
var webAppUrl = "https://script.google.com/macros/s/<unique webapp ID>/exec";
var ssID = "<unique spreadsheet ID>";
var ss = SpreadsheetApp.openById(ssID);


function getMe() {
  var response = UrlFetchApp.fetch(url + "/getMe");
  Logger.log(response.getContentText());
}

function getUpdates() {
  var response = UrlFetchApp.fetch(url + "/getUpdates");
  Logger.log(response.getContentText());
}

function setWebHook() {
  var response = UrlFetchApp.fetch(url + "/setWebhook?url=" + webAppUrl);
  Logger.log(response.getContentText());
}

function sendText(id, text){
  var response = UrlFetchApp.fetch(url + "/sendMessage?chat_id=" + id + "&text=" + text);
  Logger.log(response.getContentText());
}

function doGet(e){
  return HtmlService.createHtmlOutput("Hello"+JSON.stringify(e));
}

function doPost(e){
  var contents = JSON.parse(e.postData.contents);
  //GmailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Telegram Bot Update", JSON.stringify(contents, null, 4));
  var text = contents.message.text;
  var id = contents.message.from.id;
  var name = contents.message.from.first_name + ' ' + contents.message.from.last_name;
  var reply = "Hi " +name+", you sent '" + text+"'";
  sendText(id,reply);
  // (DEBUGGING)
  
  var text_arr = text.split(' ');
  var len = text_arr.length;
  var acc = determineAccount(text_arr[0]);
  var amt = len > 1 ? text_arr[1] : "";
  var cat = len > 2 ? determineCategory(text_arr[2]) : "";
  var rem = len > 3 ? text_arr.slice(3, len).join(' ') : "";
  updateAccount(id, amt, acc, cat, rem);
  var msgLog = ss.getSheetByName("MessageLog");
  msgLog.appendRow([new Date(), id, name, text, contents]);
}


// IMPORTANT FUNCTIONS ABOVE

function determineAccount(text){
  var arr = ["All", "Wallet", "Bank", "Savings", "Card", "Cimb"];
  var sheetName = capitalize(text);
  if (arr.indexOf(sheetName)>-1){
    return sheetName;
  }
  else{
    return "error";
  }
}

function determineCategory(text){
  var arr = ["Food", "Transport", "Entertainment", "Misc"];
  text = capitalize(text);
  if (arr.indexOf(text)>-1){
    return text;
  }
  else{
    return "!cat";
  }
}

function capitalize(text){
  return text.charAt(0).toUpperCase() + text.slice(1);
}


function updateAccount(contact_id, value, sheetName, category, remarks){
  category = typeof category !== 'undefined' ? category : "";
  remarks = typeof remarks !== 'undefined' ? remarks : "";
  var accounts = ["Cimb", "Bank", "Savings", "Card", "Wallet"];
  var sheetMoneys = ss.getSheetByName("Moneys") ? ss.getSheetByName("Moneys") : ss.insertSheet("Moneys");
  
  // 1st level; issues with the input
  if(isNaN(value) && value!="check" && value!=""){
    sendText( contact_id, "Error: Input is not numeric.");
  }
  else if(sheetName=="error"){
    sendText( contact_id, "Error: Invalid sheetName.");
  }
  else if(sheetName == "All"){
    var reply = "reply";
    for (var i=0;i<accounts.length;i++){
      var balanceID = "B" + (i+2).toString();
      var balanceValue = sheetMoneys.getRange(balanceID).getValue();
      sendText(contact_id, accounts[i] + ': $' + balanceValue);
      reply += accounts[i] + ": $" + balanceValue + ".\n";
    }
    sendText(contact_id, reply);
  }
  else{
    for (var i=0;i<accounts.length;i++){
      if (sheetName == accounts[i]){
        var k = (i+2).toString();
        var balanceID = "B" + k;
        var balancePointerID = "C" + k;
        break;
      }
    }
    var balanceValue = sheetMoneys.getRange(balanceID).getValue();
    var balancePointerValue = sheetMoneys.getRange(balancePointerID).getValue();
    
    // 2nd level; Issues with the spreadsheet
    
    if (isNaN(balanceValue)){
      var reply = "Error: Excel sheet is not numeric. Reset cell value to previous balance? (Y/N)";
    }
    else if (value=="check" || value==0){
      var reply = sheetName + " current balance: $" + balanceValue;
    }
    else{ // update balance
      value = parseFloat(value); 
      var newBalance = parseFloat(balanceValue+value).toFixed(2); // calculate new value after depositing/withdrawing amount
      
      // Go to worksheet for that specific account
      var sheet = ss.getSheetByName(sheetName) ? ss.getSheetByName(sheetName) : ss.insertSheet(sheetName);
      var date = newFormatDate(343);
      sheet.appendRow([date, value, newBalance, category, remarks]); // update transaction
      
      // Go back to "Moneys" worksheet
      
      // update current pointer and balance
      var newBalancePointer = balancePointerValue.charAt(0) + (parseInt(balancePointerValue.slice(1))+1).toString();// C(i) --> C(i+1) increment curr row by 1
      sheetMoneys.getRange(balancePointerID).setValue(newBalancePointer); // update pointer to previous balance
      //sheet.getRange(balanceID).setValue(newBalance); // update sheet balance
      
      // send a reply
      var reply = sheetName + " updated, " + value + ". Current balance: $" + newBalance;
    } 
    sendText( contact_id, reply);
    
  }
}

function newFormatDate(buffer) {
    var d = new Date(),
        second = '' + (d.getSeconds()),
        minute = '' + (d.getMinutes()),
        hour = '' + (d.getHours()),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();
  
    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;
  var newDate = [year, month, day].join('-');
  var newTime = [hour, minute, second].join(':');
  var ans = newDate+' '+newTime;
  return ans;
}
