package com.yogesh.automation.ObjectiveProgramming;

public class TC16ReverseNumber {

	public static void main(String[] args) {
		TC16ReverseNumber obj = new TC16ReverseNumber();
		System.out.println(obj.reverseNum(1234567890));
	}

	public int reverseNum(int n) {
		int r = 0;
		int result = 0;
		while (n != 0) {
			r = n % 10;
			n /= 10;
			result = result * 10 + r;
		}
		return result;
	}

}
