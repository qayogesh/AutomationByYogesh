package com.yogesh.automation.ObjectiveProgramming;

import java.util.Scanner;

public class TC01FloatingNumbersSameUptoThreeDecimalPlaces {

	public static void main(String[] args) {
		// TODO Auto-generated method stub

		Scanner in = new Scanner(System.in);
		double x = in.nextDouble();
		double y = in.nextDouble();

		x = Math.round(x * 1000);
		x = x / 1000;
		y = Math.round(y * 1000);
		y = y / 1000;
		System.out.println("x " + x + " and y " + y);
		if (x == y) {
			System.out.println("x and y three decimals are matching");
		} else {
			System.out.println("x and y three decimals are NOT matching");
		}

	}

}
