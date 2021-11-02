export function removeDuplicates(arg: any[]) {
  var temp = new Array();
  label: for (var i = 0; i < arg.length; i++) {
    for (var j = 0; j < temp.length; j++) {
      //check duplicates
      if (temp[j] === arg[i]) {
        //skip if already present
        continue label;
      }
    }
    temp[temp.length] = arg[i];
  }
  return temp;
}
