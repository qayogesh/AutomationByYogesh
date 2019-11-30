package com.yogesh.automation.ObjectiveProgramming;

import java.util.Scanner;

public class TC01SumOfDigits {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		TC01SumOfDigits obj = new TC01SumOfDigits();
		System.out.println("Result " + obj.sumOfDigits());
	}

	public int sumOfDigits() {
		Scanner input = new Scanner(System.in);
		int num = input.nextInt();
		int numToAdd = 0;

		while (num > 0) {
			numToAdd += num % 10;
			System.out.println(numToAdd);
			num = num / 10;
		}
		return numToAdd;
	}

}
