package com.yogesh.automation.ObjectiveProgramming;

public class TC10SumOfDigits {

	public static void main(String[] args) {
		TC10SumOfDigits obj = new TC10SumOfDigits();
		System.out.print(obj.getSumOfDigits(123));
	}

	public int getSumOfDigits(int num) {
		int sum = 0;
		while (num > 0) {
			sum += num % 10;
			num /= 10;
		}
		return sum;
	}
}