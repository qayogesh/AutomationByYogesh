package com.yogesh.automation.ObjectiveProgramming;

public class TC12AreaOfTriangle {

	public static void main(String[] args) {
		TC12AreaOfTriangle obj = new TC12AreaOfTriangle();
		System.out.println("Area of Triangle is #" + areaOfTriangle(10, 15, 20));
	}

	public static double areaOfTriangle(double a, double b, double c) {
		System.out.println("Triangle sides are " + a + " " + b + " " + c);
		double perimeter = ((a + b + c) / 2);
		return Math.sqrt(perimeter * (perimeter - a) * (perimeter - b) * (perimeter - c));
	}

}
