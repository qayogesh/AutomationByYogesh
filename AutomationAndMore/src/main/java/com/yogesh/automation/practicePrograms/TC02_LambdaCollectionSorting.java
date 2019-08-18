package com.yogesh.automation.practicePrograms;

import java.util.ArrayList;
import java.util.Collections;

public class TC02_LambdaCollectionSorting {

	String name;
	int number;
	float price;

	TC02_LambdaCollectionSorting(String name, int number, float price) {
		name = this.name;
		number = this.number;
		price = this.price;
	}

	public static void main(String[] args) {

		ArrayList<TC02_LambdaCollectionSorting> list = new ArrayList<>();
		list.add(new TC02_LambdaCollectionSorting("sagar", 2, 20.2f));
		list.add(new TC02_LambdaCollectionSorting("harshada", 1, 10.1f));
		list.add(new TC02_LambdaCollectionSorting("vivasvan", 3, 30.3f));

		Collections.sort(list, (p1, p2) -> {
			return p1.name.compareTo(p2.name);
		});

		for (TC02_LambdaCollectionSorting obj : list) {
			System.out.println(obj.name + " " + obj.number + " " + obj.price);
		}
	}

}
