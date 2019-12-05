package com.yogesh.automation.ObjectiveProgramming;

public class TC14UglyNumbers {

	public static void main(String[] args) {
		TC14UglyNumbers obj = new TC14UglyNumbers();
		obj.uglyNum(7);
	}

	public void uglyNum(int n) {
		int x = 0;
		if (n > 0) {
			while (n != 1) {
				if (n % 5 == 0) {
					n /= 5;
				} else if (n % 3 == 0) {
					n /= 3;
				} else if (n % 2 == 0) {
					n /= 2;
				} else {
					System.out.println("It is not ugly number");
					x = 1;
					break;
				}
			}
		}
		if(x==0) System.out.println(" It's ugly number");
	}

}
