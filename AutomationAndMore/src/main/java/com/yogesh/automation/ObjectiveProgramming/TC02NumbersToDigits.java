package com.yogesh.automation.ObjectiveProgramming;

public class TC02NumbersToDigits {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		TC02NumbersToDigits obj = new TC02NumbersToDigits();
		obj.digitalNumbers(3421);
	}

	public int digitalNumbers(int num) {
		int num1 = 0;
		while (num > 0) {
			num1 = num % 10;
			System.out.println(num % 10);
			num1 += num1;
		}
		return num1;

	}

}
