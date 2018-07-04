export class InputConfig {
  required1;
  required2;
  required3;

  isValid():boolean{
  	return (this.required1!=null && this.required2!=null && this.required3!=null);
  }
}