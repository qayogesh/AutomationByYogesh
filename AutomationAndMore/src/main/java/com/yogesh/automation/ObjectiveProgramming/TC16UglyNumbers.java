package com.yogesh.automation.ObjectiveProgramming;

public class TC16UglyNumbers {

	public static void main(String[] args) {
		getUglyNum(30);
	}

	public static void getUglyNum(int n) {
		int x = 0;
		int nn=n;
			while (nn != 1) {
				if (nn % 5 == 0) {
					nn /= 5;
					System.out.println("5 #" + nn);
				} else if (nn % 3 == 0) {
					nn /= 3;
					System.out.println("3 #" + nn);
				} else if (nn % 2 == 0) {
					nn /= 2;
					System.out.println("2 #" + nn);
				} else {
					x = 1;
					break;
				}
			}
	
		if (x == 0) {
			System.out.println(n + " is ugly number");
		} else {
			System.out.println(n + " is not ugly number");
		}
	}

}
