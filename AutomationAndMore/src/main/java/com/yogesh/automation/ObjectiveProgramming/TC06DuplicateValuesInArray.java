package com.yogesh.automation.ObjectiveProgramming;

import java.util.ArrayList;

public class TC06DuplicateValuesInArray {

	public static void main(String[] args) {
		TC06DuplicateValuesInArray obj = new TC06DuplicateValuesInArray();
		Integer[] arr = { 4, 5, 6, 3, 5, 6, 2, 2, 1, 1 };
		obj.getDuplicateValues(arr);
	}

	public void getDuplicateValues(Integer[] arr) {
		ArrayList<Integer> list = new ArrayList();
		for (int i = 0; i < arr.length; i++) {
			for (int j = i + 1; j < arr.length; j++) {
				if (arr[j] == arr[i]) {
					list.add(arr[j]);
				}
			}
		}

		System.out.println("Duplicate elements are:");
		for (int i : list) {
			System.out.print(i + ", ");
		}
	}
}
