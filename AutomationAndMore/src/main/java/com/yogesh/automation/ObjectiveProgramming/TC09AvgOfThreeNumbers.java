package com.yogesh.automation.ObjectiveProgramming;

public class TC09AvgOfThreeNumbers {

	public static void main(String[] args) {
		TC09AvgOfThreeNumbers obj = new TC09AvgOfThreeNumbers();
		System.out.print(Math.round(obj.getAvg(3.5, 4.5, 5.50)));

	}
	
	public double getAvg(double a, double b, double c) {
		return a+b+c/3;
	}

}
